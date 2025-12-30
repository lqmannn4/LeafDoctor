import os
import shutil
import datetime
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
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from tensorflow import keras
import numpy as np
from PIL import Image
import google.generativeai as genai

# --- Database & Auth ---
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from passlib.context import CryptContext
from jose import JWTError, jwt

# ==========================================
# 1. CONFIGURATION
# ==========================================
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey123") # Change in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3000

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set.")
genai.configure(api_key=api_key)

# ==========================================
# 2. DATABASE SETUP (SQLite)
# ==========================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./plants.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    diagnoses = relationship("Diagnosis", back_populates="owner")

class Diagnosis(Base):
    __tablename__ = "diagnoses"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    disease_name = Column(String)
    confidence = Column(String)
    advice = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="diagnoses")

Base.metadata.create_all(bind=engine)

# ==========================================
# 3. AUTH UTILS
# ==========================================
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency to get current user
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# ==========================================
# 4. APP SETUP
# ==========================================
app = FastAPI(title="Plant Disease Prediction API")

# Mount 'uploads' directory to serve images
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        keras_model = keras.models.load_model("plantvillage_mobilenet_model.h5")
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
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# ==========================================
# 6. ENDPOINTS
# ==========================================

@app.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, "id": current_user.id}

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
    token: Optional[str] = None, # Optional token to link to user
    db: Session = Depends(get_db)
):
    if keras_model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    
    # 1. Validation
    if not await validate_is_plant(image):
        raise HTTPException(status_code=400, detail="Invalid Image: Not a plant.")
    
    # 2. Prediction
    processed = preprocess_image(image)
    preds = keras_model.predict(processed, verbose=0)[0]
    top_3_idx = np.argsort(preds)[-3:][::-1]
    
    results = []
    for i in top_3_idx:
        results.append({"class_name": CLASS_LABELS[i], "confidence_score": float(preds[i])})
    
    main_disease = results[0]["class_name"]
    confidence_str = f"{results[0]['confidence_score']:.2f}"
    advice = await generate_advice(main_disease)
    
    # 3. Saving (If requested and user is authenticated)
    if save and token:
        try:
            # Manually decode token here to avoid failing the whole request if token is invalid
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            user = db.query(User).filter(User.email == email).first()
            
            if user:
                # Save Image to Disk
                filename = f"{datetime.datetime.utcnow().timestamp()}_{file.filename}"
                filepath = UPLOAD_DIR / filename
                with open(filepath, "wb") as f:
                    f.write(contents) # Write the bytes we read earlier
                
                # Save to DB
                diagnosis = Diagnosis(
                    filename=filename,
                    disease_name=main_disease,
                    confidence=confidence_str,
                    advice=advice,
                    user_id=user.id
                )
                db.add(diagnosis)
                db.commit()
        except Exception as e:
            print(f"SAVE ERROR: {e}")
            # Don't fail the prediction just because save failed
            pass

    return {"top_3_predictions": results, "advice": advice}

@app.get("/my-garden", response_model=List[DiagnosisResponse])
async def get_my_garden(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Diagnosis).filter(Diagnosis.user_id == current_user.id).all()

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"message": "API is running"}
