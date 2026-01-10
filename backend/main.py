import os
import shutil
import datetime
import csv
from typing import Dict, List, Optional
from pathlib import Path
from io import BytesIO

# --- Environment & Logging ---
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
try:
    from absl import logging as absl_logging
    absl_logging.set_verbosity(absl_logging.ERROR)
except ImportError:
    pass

from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# --- FastAPI & Third Party ---
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from tensorflow import keras
import numpy as np
from PIL import Image
import google.generativeai as genai

from passlib.context import CryptContext
from jose import JWTError, jwt

# ==========================================
# 1. CONFIGURATION
# ==========================================
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey123") # Change in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3000
TEMPERATURE = 2.0 # Higher = softer (less confident) predictions

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set.")
genai.configure(api_key=api_key)

# ==========================================
# 2. CSV DATABASE SETUP
# ==========================================
USERS_CSV = Path("users.csv")
DIAGNOSES_CSV = Path("diagnoses.csv")
SCHEDULES_CSV = Path("schedules.csv")

def init_csvs():
    if not USERS_CSV.exists():
        with open(USERS_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "email", "hashed_password"]) # Header

    if not DIAGNOSES_CSV.exists():
        with open(DIAGNOSES_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "filename", "disease_name", "confidence", "advice", "timestamp", "user_id"]) # Header

    if not SCHEDULES_CSV.exists():
        with open(SCHEDULES_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "diagnosis_id", "user_id", "water_interval_days", "last_watered_date"]) # Header

init_csvs()

def get_next_id(csv_path: Path) -> int:
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        data = list(reader)
        if len(data) <= 1:
            return 1
        last_row = data[-1]
        try:
            return int(last_row[0]) + 1
        except ValueError:
            return 1 # Fallback if ID is corrupted

# ==========================================
# 3. AUTH UTILS
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
    if not USERS_CSV.exists():
        return None
    with open(USERS_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["email"] == email:
                return row
    return None

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        print(f"DEBUG: Missing or invalid Authorization header on {request.method} {request.url.path}")
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
        print(f"DEBUG: Token validation failed: {e}")
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
# 4. APP SETUP
# ==========================================
app = FastAPI(title="Plant Disease Prediction API")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    if request.method == "DELETE":
        print(f"DEBUG: Incoming DELETE request to {request.url.path}")
        print(f"DEBUG: Headers: {dict(request.headers)}")
    response = await call_next(request)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
        keras_model = keras.models.load_model("plantvillage_mobilenet_model.keras")
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")

# ==========================================
# 5. Pydantic Models
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
# 6. ENDPOINTS
# ==========================================

@app.post("/register", response_model=Token)
def register(user: UserCreate):
    if get_user_by_email(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_id = get_next_id(USERS_CSV)
    
    with open(USERS_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([new_id, user.email, hashed_password])
    
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
    save: bool = False, # Optional flag to save result
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
    
    # Temperature Scaling to soften "100%" predictions
    # Formula: softmax(log(preds) / T)
    logits = np.log(preds + 1e-7)
    softened_preds = np.exp(logits / TEMPERATURE)
    preds = softened_preds / np.sum(softened_preds)
    
    top_3_idx = np.argsort(preds)[-3:][::-1]
    
    results = []
    for i in top_3_idx:
        results.append({"class_name": CLASS_LABELS[i], "confidence_score": float(preds[i])})
    
    main_disease = results[0]["class_name"]
    confidence_str = f"{results[0]['confidence_score']:.2f}"
    
    # --- SANITY CHECK ---
    # Check if the prediction is realistic or if the model is confused.
    top_conf = results[0]["confidence_score"]
    second_conf = results[1]["confidence_score"] if len(results) > 1 else 0.0
    
    if top_conf < 0.35:
        # Confidence too low (given Temperature=2.0, 0.35 is a reasonable threshold)
        main_disease = "Uncertain Diagnosis"
        advice = "The AI is not confident in this diagnosis (Confidence < 35%). Please ensure the image is clear, well-lit, and focused on the leaf. Try taking another photo."
        
    elif (top_conf - second_conf) < 0.05:
        # Ambiguous result (model is confused between top 2)
        main_disease = f"Ambiguous: {main_disease} or {results[1]['class_name']}"
        advice = f"The model is unsure between {results[0]['class_name']} and {results[1]['class_name']}. Please compare your plant with reference images for both conditions."
        
    elif top_conf > 0.99:
        # Suspiciously perfect (rare with T=2.0)
        print(f"WARNING: Suspiciously high confidence ({top_conf:.4f}) for {main_disease}")
        # We still return the result, but maybe with a caveat if desired. 
        # For now, we assume it's valid but log it.
        advice = await generate_advice(main_disease)
    else:
        # Normal case
        advice = await generate_advice(main_disease)
    
    if save and token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            user = get_user_by_email(email)
            
            if user:
                safe_filename = file.filename.replace(" ", "_")
                filename = f"{datetime.datetime.utcnow().timestamp()}_{safe_filename}"
                filepath = UPLOAD_DIR / filename
                with open(filepath, "wb") as f:
                    f.write(contents) 
                
                new_id = get_next_id(DIAGNOSES_CSV)
                timestamp = str(datetime.datetime.utcnow())
                
                with open(DIAGNOSES_CSV, "a", newline="", encoding="utf-8") as f:
                    writer = csv.writer(f)
                    writer.writerow([
                        new_id, 
                        filename, 
                        main_disease, 
                        confidence_str, 
                        advice.replace("\n", " "),
                        timestamp, 
                        user["id"]
                    ])
        except Exception as e:
            print(f"SAVE ERROR: {e}")
            pass

    return {"top_3_predictions": results, "advice": advice}

@app.get("/my-garden", response_model=List[DiagnosisResponse])
async def get_my_garden(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])
    diagnoses = []
    
    if DIAGNOSES_CSV.exists():
        with open(DIAGNOSES_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["user_id"] == user_id:
                    diagnoses.append(row)
    
    return diagnoses

@app.post("/schedules", response_model=ScheduleResponse)
async def create_schedule(schedule: ScheduleCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])
    
    # Check if schedule already exists for this diagnosis
    rows = []
    updated = False
    new_data = None
    
    if SCHEDULES_CSV.exists():
        with open(SCHEDULES_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["diagnosis_id"] == str(schedule.diagnosis_id) and row["user_id"] == user_id:
                    # Update existing
                    row["water_interval_days"] = str(schedule.water_interval_days)
                    # Don't reset last_watered_date if updating interval
                    new_data = row
                    updated = True
                rows.append(row)
    
    if updated:
        with open(SCHEDULES_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["id", "diagnosis_id", "user_id", "water_interval_days", "last_watered_date"])
            writer.writeheader()
            writer.writerows(rows)
        return new_data

    # Create new
    new_id = get_next_id(SCHEDULES_CSV)
    new_data = {
        "id": new_id,
        "diagnosis_id": schedule.diagnosis_id,
        "user_id": user_id,
        "water_interval_days": schedule.water_interval_days,
        "last_watered_date": str(datetime.datetime.utcnow().date())
    }
    
    with open(SCHEDULES_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([new_id, schedule.diagnosis_id, user_id, schedule.water_interval_days, new_data["last_watered_date"]])
        
    return new_data

@app.get("/schedules", response_model=List[ScheduleResponse])
async def get_schedules(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])
    schedules = []
    
    if SCHEDULES_CSV.exists():
        with open(SCHEDULES_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["user_id"] == user_id:
                    schedules.append(row)
    return schedules

@app.post("/schedules/{diagnosis_id}/water")
async def water_plant(diagnosis_id: int, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])
    rows = []
    found = False
    
    if SCHEDULES_CSV.exists():
        with open(SCHEDULES_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            for row in reader:
                if row["diagnosis_id"] == str(diagnosis_id) and row["user_id"] == user_id:
                    row["last_watered_date"] = str(datetime.datetime.utcnow().date())
                    found = True
                rows.append(row)
    
    if not found:
        raise HTTPException(status_code=404, detail="Schedule not found for this plant")
        
    with open(SCHEDULES_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
        
    return {"message": "Plant watered!"}

@app.delete("/diagnoses/{diagnosis_id}")
async def delete_diagnosis(diagnosis_id: int, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])
    rows = []
    found = False
    filename_to_delete = None

    if DIAGNOSES_CSV.exists():
        with open(DIAGNOSES_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            for row in reader:
                if row["id"] == str(diagnosis_id) and row["user_id"] == user_id:
                    found = True
                    filename_to_delete = row["filename"]
                else:
                    rows.append(row)
    
    if not found:
        raise HTTPException(status_code=404, detail="Diagnosis not found or unauthorized")

    with open(DIAGNOSES_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    if filename_to_delete:
        file_path = UPLOAD_DIR / filename_to_delete
        if file_path.exists():
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error deleting file {file_path}: {e}")

    return {"message": "Diagnosis deleted successfully"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"message": "API is running (CSV Backend)"}