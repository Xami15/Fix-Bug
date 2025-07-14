from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth as firebase_auth
from sqlalchemy.orm import Session
from database.models import User
from database.db_utils import SessionLocal

app = FastAPI()

# ✅ Allow requests from React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ Create tables on app startup
from database.models import Base
from database.db_utils import engine
Base.metadata.create_all(bind=engine)

@app.post("/register-user/")
async def register_user(request: Request, company_name: str, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    id_token = auth_header.split(" ")[1]

    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        uid = decoded_token["uid"]
        email = decoded_token["email"]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

    # ✅ Check if user already exists
    existing_user = db.query(User).filter_by(firebase_uid=uid).first()
    if existing_user:
        return {"message": "User already exists"}

    # ✅ Create and save new user
    new_user = User(firebase_uid=uid, email=email, company_name=company_name)
    db.add(new_user)
    db.commit()

    return {"message": "User registered and saved to DB"}
