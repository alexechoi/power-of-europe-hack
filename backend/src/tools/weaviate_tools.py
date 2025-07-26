import os
import weaviate
from weaviate_agents.classes import QueryAgentCollectionConfig

def get_weaviate_client():
    """
    Connect to a Weaviate Cloud instance using environment variables:
    - WEAVIATE_URL: The Weaviate Cloud endpoint URL
    - WEAVIATE_API_KEY: The API key for authentication
    Returns a connected Weaviate client instance.
    """
    weaviate_url = os.environ.get("WEAVIATE_URL")
    weaviate_api_key = os.environ.get("WEAVIATE_API_KEY")
    if not weaviate_url or not weaviate_api_key:
        raise ValueError("WEAVIATE_URL and WEAVIATE_API_KEY must be set in environment variables.")
    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=weaviate_url,
        auth_credentials=weaviate.classes.init.Auth.api_key(weaviate_api_key),
    )
    return client


def is_weaviate_ready(client=None):
    """
    Check if the Weaviate Cloud instance is ready.
    If no client is provided, a new one will be created and closed after the check.
    """
    close_client = False
    if client is None:
        client = get_weaviate_client()
        close_client = True
    try:
        ready = client.is_ready()
    finally:
        if close_client:
            client.close()
    return ready


def get_query_agent(collection_name, client=None):
    """
    Return a QueryAgent for the specified collection name.
    If no client is provided, a new one will be created and closed after use.
    """

    close_client = False
    if client is None:
        client = get_weaviate_client()
        close_client = True
    try:
        agent = weaviate.agents.query.QueryAgent(
            client=client,
            collections=[
                QueryAgentCollectionConfig(
                    name=collection_name,
                    target_vector=[
                        "text2vecweaviate",
                    ],
                ),
            ],
        )
    finally:
        if close_client:
            client.close()
    return agent


def query_tool_by_name(tool_name: str, collection_name: str = "EUToolsAlternatives"):
    """
    Query the QueryAgent for the given tool name in the specified collection.
    Returns the result of the query.
    """
    agent = get_query_agent(collection_name)
    # The QueryAgent interface may vary; assuming a 'query' method that takes a string
    result = agent.run(f"Please find EU based tools that are similar to {tool_name}")
    return result


