from pydantic import BaseModel

# A simple rule structure to process incoming order data safely
class OrderCreate(BaseModel):
    product_id: int
    quantity: int