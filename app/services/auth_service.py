from datetime import datetime, timedelta
from typing import Optional, Dict
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

SECRET_KEY = "ultra-quantum-secret-key"
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

# predefined users for demonstration purposes
fake_users_db: Dict[str, Dict[str, str]] = {
    "admin@demo.local": {"username": "admin@demo.local", "password": "adminpass", "role": "admin"},
    "reception@demo.local": {"username": "reception@demo.local", "password": "receptionpass", "role": "user"},
}

# authentication scheme
def authenticate_user(username: str, password: str) -> Optional[Dict]:
    user = fake_users_db.get(username)
    if not user:
        return None
    if user["password"] != password:
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) ->str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if not username or not role:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = fake_users_db.get(username)
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return {"username": username, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    
    
def require_role(required_role: str):
    def checker(user=Depends(get_current_user)):
        if user["role"] != required_role:
            raise HTTPException(status_code=403, detail="Operation not permitted!")
        return user
    return checker
