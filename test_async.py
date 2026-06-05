import asyncio
from asgiref.sync import async_to_sync

class TestClass:
    async def my_async_method(self, arg):
        print(f"Running async method with arg: {arg}")
        return [arg]

def main():
    obj = TestClass()
    try:
        result = async_to_sync(obj.my_async_method)("test")
        print(f"Result: {result}")
    except Exception as e:
        print(f"Error: {e}")

main()
