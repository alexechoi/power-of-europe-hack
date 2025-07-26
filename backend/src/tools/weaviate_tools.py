import os
import logging
import weaviate
from weaviate import Client, use_async_with_weaviate_cloud, classes
from weaviate_agents.classes import QueryAgentCollectionConfig

headers = {
    "X-OpenAI-Api-Key": os.environ.get("OPENAI_API_KEY"),
    "X-OpenAI-Baseurl": os.environ.get("OPENAI_BASE_URL"),
}

async def get_weaviate_client():
    """
    Connect to a Weaviate Cloud instance using environment variables:
    - WEAVIATE_URL: The Weaviate Cloud endpoint URL
    - WEAVIATE_API_KEY: The API key for authentication
    Returns a connected Weaviate client instance.
    """
    weaviate_url = os.environ.get("WEAVIATE_INSTANCE_URL")
    weaviate_api_key = os.environ.get("WEAVIATE_INSTANCE_API_KEY")
    if not weaviate_url or not weaviate_api_key:
        raise ValueError("WEAVIATE_URL and WEAVIATE_API_KEY must be set in environment variables.")
    client = use_async_with_weaviate_cloud(
        cluster_url=weaviate_url,
        auth_credentials=classes.init.Auth.api_key(weaviate_api_key),
        headers=headers,
    )
    await client.connect()
    return client


async def is_weaviate_ready(client=None):
    """
    Check if the Weaviate Cloud instance is ready.
    If no client is provided, a new one will be created and closed after the check.
    """
    close_client = False
    if client is None:
        client = await get_weaviate_client()
        close_client = True
    try:
        ready = await client.is_ready()
    finally:
        if close_client:
            await client.close()
    return ready


async def get_query_agent(collection_name, client=None):
    """
    Return a QueryAgent for the specified collection name.
    If no client is provided, a new one will be created and closed after use.
    """

    close_client = False
    if client is None:
        client = await get_weaviate_client()
        close_client = True
    try:
        agent = weaviate.agents.query.AsyncQueryAgent(
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
            await client.close()
    return agent


async def query_tool_by_name(tool_name: str):
    """
    Query the QueryAgent for the given tool name in the specified collection.
    Returns the result of the query.
    """
    logging.info("Getting the query agent!")
    agent = await get_query_agent("EUToolsAlternatives")
    logging.info(f"retreived query agent: {agent}")
    # The QueryAgent interface may vary; assuming an async 'run' method that takes a string
    try:
        result = await agent.run(f"Please find EU based tools that are similar to {tool_name}")
    except Exception as e:
        logging.error(f"Failed to query agent for tool '{tool_name}': {e}", exc_info=True)
        result = None
    logging.info(f"Got result {getattr(result, 'final_answer', None)}")
    return result


