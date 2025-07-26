class LocalCollection:
    """
    A simple in-memory collection mimicking basic MongoDB collection behavior.
    Stores documents as a list of dicts.
    """

    def __init__(self):
        self._docs = []

    def insert_one(self, doc):
        """Insert a single document (dict) into the collection."""
        self._docs.append(doc.copy())
        return {"inserted_id": id(doc)}

    def insert_many(self, docs):
        """Insert multiple documents (list of dicts) into the collection."""
        for doc in docs:
            self.insert_one(doc)
        return {"inserted_count": len(docs)}

    def find(self, query=None):
        """Find all documents matching the query dict (simple equality match)."""
        if query is None or not query:
            return self._docs.copy()
        results = []
        for doc in self._docs:
            if all(doc.get(k) == v for k, v in query.items()):
                results.append(doc)
        return results

    def find_one(self, query=None):
        """Find the first document matching the query dict."""
        results = self.find(query)
        return results[0] if results else None

    def delete_one(self, query):
        """Delete the first document matching the query dict."""
        for i, doc in enumerate(self._docs):
            if all(doc.get(k) == v for k, v in query.items()):
                del self._docs[i]
                return {"deleted_count": 1}
        return {"deleted_count": 0}

    def delete_many(self, query):
        """Delete all documents matching the query dict."""
        to_delete = [doc for doc in self._docs if all(doc.get(k) == v for k, v in query.items())]
        count = len(to_delete)
        self._docs = [doc for doc in self._docs if doc not in to_delete]
        return {"deleted_count": count}

    def update_one(self, query, update):
        """Update the first document matching the query dict with the update dict (only $set supported)."""
        for doc in self._docs:
            if all(doc.get(k) == v for k, v in query.items()):
                if "$set" in update:
                    doc.update(update["$set"])
                return {"matched_count": 1, "modified_count": 1}
        return {"matched_count": 0, "modified_count": 0}

    def update_many(self, query, update):
        """Update all documents matching the query dict with the update dict (only $set supported)."""
        matched = 0
        for doc in self._docs:
            if all(doc.get(k) == v for k, v in query.items()):
                if "$set" in update:
                    doc.update(update["$set"])
                matched += 1
        return {"matched_count": matched, "modified_count": matched}
