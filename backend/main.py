import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"      # 0=ALL, 1=INFO, 2=WARNING, 3=ERROR
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"     # optional, disables oneDNN messages
from absl import logging as absl_logging
absl_logging.set_verbosity(absl_logging.ERROR)
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware  
from tensorflow import keras
import numpy as np
from PIL import Image
import io
from typing import Dict, List
from pathlib import Path
from dotenv import load_dotenv

import google.generativeai as genai

# Load environment variables from .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Configure Gemini with API Key from environment variable
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set. Please create a .env file with GEMINI_API_KEY=your_key_here")
genai.configure(api_key=api_key)

app = FastAPI(title="Plant Disease Prediction API")
    
# Class labels matching the PlantVillage dataset
CLASS_LABELS = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy"
]

# Configure CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Common Next.js ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variable to store the loaded model
keras_model = None  # Renamed to avoid confusion with Gemini model

@app.on_event("startup")
async def load_model():
    """Load the Keras model on startup"""
    global keras_model
    try:
        keras_model = keras.models.load_model("plantvillage_mobilenet_model.h5")
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        raise

def preprocess_image(image: Image.Image) -> np.ndarray:
    """
    Preprocess image for MobileNet model:
    - Resize to 224x224
    - Convert to RGB if needed
    - No normalization here (model does Rescaling)
    - Expand dimensions for batch
    Returns array in [0, 255] float32
    """
    # Convert to RGB if needed
    if image.mode != "RGB":
        image = image.convert("RGB")
    
    # Resize to 224x224
    image = image.resize((224, 224))
    
    # Convert to numpy array in float32, no normalization!
    img_array = np.array(image, dtype=np.float32)
    
    # Expand dimensions to add batch dimension: (224, 224, 3) -> (1, 224, 224, 3)
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array

async def validate_is_plant(image: Image.Image) -> bool:
    try:
        gemini_model = genai.GenerativeModel("models/gemini-2.5-flash")
        prompt = "Is this a picture of a plant, leaf, fruit, or crop? Answer strictly YES or NO."
        # Pass the PIL image directly along with the prompt.
        response = await gemini_model.generate_content_async([prompt, image])
        # Debug output: print raw response from Gemini
        print(f'Gemini Guardrail Response: {getattr(response, "text", None)}')

        if hasattr(response, "text"):
            clean_answer = response.text.strip().upper()
            if "YES" in clean_answer:
                return True
            if "NO" in clean_answer:
                return False

        return True  # Default to allow if answer is unclear

    except Exception as e:
        print(f"GEMINI VALIDATION ERROR: {str(e)}")
        return True  # Fail open to prevent crashing

async def generate_advice(disease_name: str) -> str:
    """
    Generate treatment advice using Gemini with specific Markdown formatting.
    """
    if "healthy" in disease_name.lower():
        return "The plant is healthy! Keep up the good work with regular watering and monitoring."

    # 1. Improved Prompt to force **Bold** formatting
    prompt = (
        f"My plant has {disease_name}. "
        "Provide 3 brief, actionable steps for a farmer to cure or manage this. "
        "Format the **Header** of each step in bold markdown (e.g. **Apply Fungicide:**). "
        "Keep the tone professional. Limit to 100 words."
    )

    try:
        # 2. Safety Settings (Prevent blocking "Medical/Chemical" advice)
        safety_settings = [
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE",
            },
        ]

        gemini_model = genai.GenerativeModel("models/gemini-2.5-flash")

        response = await gemini_model.generate_content_async(
            prompt, 
            safety_settings=safety_settings
        )

        if hasattr(response, "text") and response.text:
            return response.text.strip()
        else:
            # If blocked despite settings
            print(f"Gemini blocked response. Safety ratings: {getattr(response, 'prompt_feedback', None)}")
            return "AI advice unavailable due to safety filters. Please consult a manual guide."

    except Exception as e:
        print(f'GEMINI ERROR: {str(e)}')
        return "AI advice unavailable. Please consult a manual guide."

@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> Dict:
    """
    Predict plant disease from uploaded image.

    Guardrails:
        - Validates that the image appears to contain a plant leaf/crop image using Gemini 2.5-Flash.
    Returns:
        - top_3_predictions: List of top 3 predictions, each with class_name and confidence_score
        - advice: Treatment/care advice for the top prediction
    """
    if keras_model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Guardrail: Check if this is a plant image using Gemini 2.5-Flash
        is_plant = await validate_is_plant(image)
        if not is_plant:
            raise HTTPException(
                status_code=400,
                detail="Invalid Image: This does not appear to be a plant leaf. Please upload a clear photo of a crop."
            )
        
        # Preprocess image
        processed_image = preprocess_image(image)
        
        # Print min/max for sanity check before prediction
        print(f"img_array.min() = {processed_image.min()}, img_array.max() = {processed_image.max()}")
        
        # Make prediction
        predictions = keras_model.predict(processed_image, verbose=0)
        prediction_scores = predictions[0]
        
        # Get top 3 class indices (sorted by confidence in descending order)
        top_3_indices = np.argsort(prediction_scores)[-3:][::-1]
        
        # Build top 3 predictions list
        top_3_predictions = []
        for idx in top_3_indices:
            class_index = int(idx)
            confidence_score = float(prediction_scores[class_index])
            class_name = CLASS_LABELS[class_index] if class_index < len(CLASS_LABELS) else f"Unknown_{class_index}"
            
            top_3_predictions.append({
                "class_name": class_name,
                "confidence_score": confidence_score
            })
        
        # Take the top predicted class for advice
        main_predicted_class = top_3_predictions[0]["class_name"]
        advice = await generate_advice(main_predicted_class)
        
        return {
            "top_3_predictions": top_3_predictions,
            "advice": advice
        }
    
    except HTTPException:
        raise  # re-raise FastAPI HTTPExceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Plant Disease Prediction API is running", "model_loaded": keras_model is not None}

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "model_loaded": keras_model is not None}

