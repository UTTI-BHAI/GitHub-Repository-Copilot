from database.connection import engine, Base
import database.models

print(database.models.__file__)
print(Base.metadata.tables.keys())

Base.metadata.create_all(bind=engine)