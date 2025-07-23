from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ✅ Plug in your real Railway DB password here
DATABASE_URL = "postgresql://postgres:123456789@hopper.proxy.rlwy.net:42247/railway"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
