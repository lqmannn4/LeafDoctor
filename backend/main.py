import os
import shutil
import datetime
from typing import Dict, List, Optional
from pathlib import Path
from io import BytesIO

# --- Environment & Logging ---
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# --- FastAPI & Third Party ---
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import tf_keras as keras
import numpy as np
from PIL import Image
import google.generativeai as genai

from passlib.context import CryptContext
from jose import JWTError, jwt
from supabase import create_client, Client

# ==========================================
# 1. CONFIGURATION
# ==========================================
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3000
TEMPERATURE = 2.0

# Gemini Setup
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Warning only, to allow build to pass if just installing dependencies
    print("WARNING: GEMINI_API_KEY not set.")
else:
    genai.configure(api_key=api_key)

# Supabase Setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("WARNING: SUPABASE_URL or SUPABASE_KEY not set. Database features will fail.")

# ==========================================
# 2. AUTH UTILS
# ==========================================
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(email: str):
    if not supabase: return None
    try:
        response = supabase.table("users").select("*").eq("email", email).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"DB Error: {e}")
        return None

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise JWTError("No sub in payload")
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_user_by_email(email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ==========================================
# 3. APP SETUP
# ==========================================
app = FastAPI(title="Plant Disease Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load AI Model
keras_model = None
CLASS_LABELS = [
    "Apple___Apple_scab", "Apple___Black_rot", "Apple___Cedar_apple_rust", "Apple___healthy",
    "Blueberry___healthy", "Cherry_(including_sour)___Powdery_mildew", "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot", "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight", "Corn_(maize)___healthy", "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)", "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)", "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)", "Peach___Bacterial_spot", "Peach___healthy",
    "Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy", "Potato___Early_blight",
    "Potato___Late_blight", "Potato___healthy", "Raspberry___healthy", "Soybean___healthy",
    "Squash___Powdery_mildew", "Strawberry___Leaf_scorch", "Strawberry___healthy",
    "Tomato___Bacterial_spot", "Tomato___Early_blight", "Tomato___Late_blight",
    "Tomato___Leaf_Mold", "Tomato___Septoria_leaf_spot", "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot", "Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy"
]

@app.on_event("startup")
async def load_model():
    global keras_model
    try:
        # Check if model exists locally (for Render)
        model_path = "plantvillage_mobilenet_model.keras"
        if os.path.exists(model_path):
            keras_model = keras.models.load_model(model_path)
            print("Model loaded successfully!")
        else:
            print("Model file not found. Prediction will fail.")
    except Exception as e:
        print(f"Error loading model: {e}")

# ==========================================
# 4. Pydantic Models
# ==========================================
class UserCreate(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []

class DiagnosisResponse(BaseModel):
    id: int
    filename: str
    disease_name: str
    confidence: str
    advice: str
    timestamp: str 
    
    class Config:
        from_attributes = True

class ScheduleCreate(BaseModel):
    diagnosis_id: int
    water_interval_days: int

class ScheduleResponse(BaseModel):
    id: int
    diagnosis_id: int
    user_id: int
    water_interval_days: int
    last_watered_date: str

# ==========================================
# 5. ENDPOINTS
# ==========================================

@app.post("/register", response_model=Token)
def register(user: UserCreate):
    if not supabase: raise HTTPException(500, "DB not configured")
    if get_user_by_email(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    
    try:
        supabase.table("users").insert({
            "email": user.email, 
            "hashed_password": hashed_password
        }).execute()
    except Exception as e:
        print(f"Register Error: {e}")
        raise HTTPException(500, "Registration failed")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"email": current_user["email"], "id": current_user["id"]}

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        system_prompt = "You are 'LeafDoctor AI', an agricultural expert. Keep answers concise."
        gemini_history = []
        for msg in request.history:
            gemini_history.append({
                "role": "user" if msg["role"] == "user" else "model",
                "parts": [msg["content"]]
            })
        
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        chat_session = model.start_chat(history=gemini_history)
        
        msg = request.message
        if not gemini_history:
            msg = f"{system_prompt}\n\n{request.message}"
            
        response = await chat_session.send_message_async(msg)
        return {"response": response.text}
    except Exception as e:
        print(f"CHAT ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def preprocess_image(image: Image.Image) -> np.ndarray:
    if image.mode != "RGB":
        image = image.convert("RGB")
    image = image.resize((224, 224))
    img_array = np.array(image, dtype=np.float32)
    return np.expand_dims(img_array, axis=0)

async def validate_is_plant(image: Image.Image) -> bool:
    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = await model.generate_content_async(["Is this a picture of a plant, leaf, fruit, or crop? Answer strictly YES or NO.", image])
        return "YES" in response.text.strip().upper()
    except:
        return True

async def generate_advice(disease_name: str) -> str:
    if "healthy" in disease_name.lower():
        return "The plant is healthy!"
    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        prompt = f"My plant has {disease_name}. Provide 3 brief, actionable steps. Bold the headers."
        response = await model.generate_content_async(prompt)
        return response.text.strip()
    except:
        return "AI advice unavailable."

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    save: bool = False,
    token: Optional[str] = None
):
    if keras_model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    contents = await file.read()
    image = Image.open(BytesIO(contents))
    
    if not await validate_is_plant(image):
        raise HTTPException(status_code=400, detail="Invalid Image: Not a plant.")
    
    processed = preprocess_image(image)
    preds = keras_model.predict(processed, verbose=0)[0]
    
    # Temperature Scaling
    logits = np.log(preds + 1e-7)
    softened_preds = np.exp(logits / TEMPERATURE)
    preds = softened_preds / np.sum(softened_preds)
    
    top_3_idx = np.argsort(preds)[-3:][::-1]
    
    results = []
    for i in top_3_idx:
        results.append({"class_name": CLASS_LABELS[i], "confidence_score": float(preds[i])})
    
    main_disease = results[0]["class_name"]
    confidence_str = f"{results[0]['confidence_score']:.2f}"
    
    # Logic
    top_conf = results[0]["confidence_score"]
    second_conf = results[1]["confidence_score"] if len(results) > 1 else 0.0
    
    if top_conf < 0.35:
        main_disease = "Uncertain Diagnosis"
        advice = "The AI is not confident. Please ensure image is clear."
    elif (top_conf - second_conf) < 0.05:
        main_disease = f"Ambiguous: {main_disease} or {results[1]['class_name']}"
        advice = f"The model is unsure between {results[0]['class_name']} and {results[1]['class_name']}."
    else:
        advice = await generate_advice(main_disease)
    
    if save and token and supabase:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            user = get_user_by_email(email)
            
            if user:
                # 1. Upload to Supabase Storage
                safe_filename = file.filename.replace(" ", "_")
                file_path = f"{user['id']}/{datetime.datetime.utcnow().timestamp()}_{safe_filename}"
                
                # Reset file pointer for upload
                file.file.seek(0)
                file_bytes = await file.read()
                
                try:
                    supabase.storage.from_("plant-images").upload(
                        path=file_path,
                        file=file_bytes,
                        file_options={"content-type": file.content_type}
                    )
                    
                    # 2. Get Public URL
                    public_url = supabase.storage.from_("plant-images").get_public_url(file_path)
                    
                    # 3. Save to DB
                    timestamp = str(datetime.datetime.utcnow())
                    supabase.table("diagnoses").insert({
                        "user_id": user["id"],
                        "filename": public_url, # Store full URL!
                        "disease_name": main_disease,
                        "confidence": confidence_str,
                        "advice": advice,
                        "timestamp": timestamp
                    }).execute()
                    
                except Exception as storage_err:
                    print(f"Storage/DB Error: {storage_err}")
                    pass

        except Exception as e:
            print(f"SAVE ERROR: {e}")
            pass

    return {"top_3_predictions": results, "advice": advice}

@app.get("/my-garden", response_model=List[DiagnosisResponse])
async def get_my_garden(current_user: dict = Depends(get_current_user)):
    if not supabase: return []
    try:
        response = supabase.table("diagnoses").select("*").eq("user_id", current_user["id"]).execute()
        return response.data
    except Exception as e:
        print(f"Fetch Error: {e}")
        return []

@app.post("/schedules", response_model=ScheduleResponse)
async def create_schedule(schedule: ScheduleCreate, current_user: dict = Depends(get_current_user)):
    if not supabase: raise HTTPException(500, "DB Error")
    user_id = current_user["id"]
    
    # Check existing
    try:
        existing = supabase.table("schedules").select("*").eq("diagnosis_id", schedule.diagnosis_id).eq("user_id", user_id).execute()
        
        if existing.data and len(existing.data) > 0:
            # Update
            row_id = existing.data[0]["id"]
            res = supabase.table("schedules").update({
                "water_interval_days": schedule.water_interval_days
            }).eq("id", row_id).execute()
            return res.data[0]
        else:
            # Create
            res = supabase.table("schedules").insert({
                "diagnosis_id": schedule.diagnosis_id,
                "user_id": user_id,
                "water_interval_days": schedule.water_interval_days,
                "last_watered_date": str(datetime.datetime.utcnow().date())
            }).execute()
            return res.data[0]
    except Exception as e:
        print(f"Schedule Error: {e}")
        raise HTTPException(500, "Failed to save schedule")

@app.get("/schedules", response_model=List[ScheduleResponse])
async def get_schedules(current_user: dict = Depends(get_current_user)):
    if not supabase: return []
    try:
        response = supabase.table("schedules").select("*").eq("user_id", current_user["id"]).execute()
        return response.data
    except Exception as e:
        return []

@app.post("/schedules/{diagnosis_id}/water")
async def water_plant(diagnosis_id: int, current_user: dict = Depends(get_current_user)):
    if not supabase: raise HTTPException(500, "DB Error")
    try:
        # Find schedule
        existing = supabase.table("schedules").select("*").eq("diagnosis_id", diagnosis_id).eq("user_id", current_user["id"]).execute()
        if not existing.data:
            raise HTTPException(404, "Schedule not found")
        
        row_id = existing.data[0]["id"]
        today = str(datetime.datetime.utcnow().date())
        supabase.table("schedules").update({"last_watered_date": today}).eq("id", row_id).execute()
        return {"message": "Plant watered!"}
    except Exception as e:
        print(e)
        raise HTTPException(500, "Update failed")

@app.delete("/diagnoses/{diagnosis_id}")
async def delete_diagnosis(diagnosis_id: int, current_user: dict = Depends(get_current_user)):
    if not supabase: raise HTTPException(500, "DB Error")
    
    try:
        # Get diagnosis to find file path
        # Note: diagnosis_id might be int, ensure DB matches
        diag = supabase.table("diagnoses").select("*").eq("id", diagnosis_id).eq("user_id", current_user["id"]).execute()
        
        if not diag.data:
            raise HTTPException(404, "Not found")
            
        record = diag.data[0]
        # Filename is now a full URL: https://.../public/plant-images/USER_ID/TIMESTAMP_NAME
        # We need to extract the path after 'plant-images/'
        
        if "plant-images" in record["filename"]:
            # Splitting by 'plant-images/' is a safe bet for standard Supabase URLs
            file_path = record["filename"].split("plant-images/")[-1]
            # Remove file from storage
            supabase.storage.from_("plant-images").remove(file_path)

        # Remove from DB
        supabase.table("diagnoses").delete().eq("id", diagnosis_id).execute()
        return {"message": "Deleted"}
        
    except Exception as e:
        print(f"Delete Error: {e}")
        raise HTTPException(500, "Delete failed")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"message": "API is running (Supabase Backend)"}
