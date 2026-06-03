import chromadb 
client = chromadb.PersistentClient(path="/Users/ashmithandoo/Projects/git/ResearchRAG/data/chroma_db")

collections = client.list_collections()

for col in collections:
    print(col.name)

collection = client.get_collection("research_literature")
print("Total documents in DB:", collection.count())