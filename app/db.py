from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = "sqlite:///./patients.db"

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

def init_db() -> None:
    from . import models  # ensure tables imported
    SQLModel.metadata.create_all(engine)

def get_session() -> Session:
    with Session(engine) as session:
        yield session
