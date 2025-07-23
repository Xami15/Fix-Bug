from fastapi import APIRouter, Depends, HTTPException, Header
from firebase_admin import auth
from sqlalchemy.orm import Session
from database.db_utils import SessionLocal
from database.models import User

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register-user/")
def register_user(company_name: str, authorization: str = Header(...), db: Session = Depends(get_db)):
    try:
        id_token = authorization.split(" ")[1]
        decoded_token = auth.verify_id_token(id_token)
        firebase_uid = decoded_token["uid"]
        email = decoded_token["email"]

        user = db.query(User).filter_by(firebase_uid=firebase_uid).first()
        if not user:
            user = User(firebase_uid=firebase_uid, email=email, company_name=company_name)
            db.add(user)
            db.commit()
            db.refresh(user)

        return {"message": "User saved", "user_id": str(user.id)}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
