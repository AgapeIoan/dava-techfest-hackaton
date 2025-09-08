from pydantic import BaseModel
from typing import Literal

class User(BaseModel):
    username: str
    password: str
    role: Literal['admin', 'user']
    