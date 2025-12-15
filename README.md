# 🌿 LeafDoctor

AI-powered leaf disease detection for farmers and plant lovers. Upload a leaf image, and LeafDoctor will:

- 🔍 Detect the most likely disease (or confirm the plant is healthy)
- 📊 Show top 3 predictions with confidence scores
- 🤖 Generate **actionable treatment advice** using Gemini

---

## 📦 Tech Stack

- **Backend**
  - 🐍 Python
  - ⚡ `FastAPI`
  - 🧠 `TensorFlow` (Keras model: `plantvillage_mobilenet_model.h5`)
  - 🖼️ `Pillow` for image handling
  - 🔢 `NumPy` for numerical operations
  - 🤖 `google-generativeai` (Gemini 2.5 Flash) for smart advice & guardrails
  - 🔐 `python-dotenv` for environment variables

- **Frontend**
  - ⚛️ `Next.js` 16
  - ⚛️ `React` 19
  - 🧩 `TypeScript`
  - 🎨 Tailwind CSS 4 (via `@tailwindcss/postcss`)

---

## 🚀 Getting Started (Local Development)

### 1️⃣ Clone the repository

```bash
git clone https://github.com/lqmannn4/LeafDoctor.git
cd LeafDoctor
```

---

### 2️⃣ Backend Setup (`backend/`)

1. **Create & activate a virtual environment** (recommended):

   ```bash
   cd backend
   # On Windows (PowerShell)
   python -m venv .venv
   .venv\Scripts\activate

   # On macOS / Linux
   # python -m venv .venv
   # source .venv/bin/activate
   ```

2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Add your Gemini API key**:

   - Create a `.env` file inside `backend/`:

     ```bash
      echo GEMINI_API_KEY=your_api_key_here > .env
     ```

   - Or create it manually with this content:

     ```env
     GEMINI_API_KEY=your_api_key_here
     ```

4. **Place the trained model file**:

   - Download `plantvillage_mobilenet_model.h5` from this link: [Google Drive model file](https://drive.google.com/file/d/1Edi_jbPPv-z7E4SJoP-Wr9Ct719CM3nM/view?usp=sharing).
   - Put `plantvillage_mobilenet_model.h5` in the `backend/` directory (same folder as `main.py`).

5. **Run the FastAPI server**:

   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at:

   - Root: `http://localhost:8000/`
   - Health: `http://localhost:8000/health`
   - Prediction endpoint: `POST http://localhost:8000/predict` (used by the frontend)

---

### 3️⃣ Frontend Setup (`frontend/`)

1. **Install Node dependencies**:

   ```bash
   cd ../frontend
   npm install
   ```

2. **Run the Next.js dev server**:

   ```bash
   npm run dev
   ```

3. **Open the app in your browser**:

   ```
   http://localhost:3000
   ```

   Make sure the backend (`http://localhost:8000`) is running so that predictions work.

---

## 🧪 How to Use

1. Start **backend** (`uvicorn`) and **frontend** (`npm run dev`).
2. Visit `http://localhost:3000`.
3. Upload a clear image of a plant leaf/crop. 🌱
4. Wait for:
   - ✅ Top-3 predicted diseases
   - 📈 Confidence scores
   - 🧠 Gemini-powered treatment advice rendered in a nice markdown view

---

## 📝 Environment & CORS

- Backend CORS is configured to allow:
  - `http://localhost:3000`
  - `http://localhost:3001`
- If you change the frontend port, update the `allow_origins` list in `backend/main.py`.

---

## 🤝 Contributions

- 💡 Ideas, bug reports, and PRs are welcome.
- Feel free to fork, experiment, and adapt this project for your own datasets or crops.

---

## ⚠️ Disclaimer

This tool is **for educational and decision-support purposes only**.
Always double-check AI-generated advice with an agronomist, local expert, or trusted agricultural resources before taking action.
