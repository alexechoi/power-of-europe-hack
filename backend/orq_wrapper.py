from typing import Dict, List, Any, Optional
import logging
import uuid
from orq_ai_sdk import Orq
import os

# Configure logging
logger = logging.getLogger(__name__)

class OrqWrapper:
    """Wrapper for Orq AI SDK"""
    
    def __init__(
        self,
        api_key: str = os.getenv("ORQ_API_KEY", "default_api_key"),
        deployment_key: str = "mistral-saba",
        contact_id: str = "contact_hackathon"
    ):
        """Initialize the Orq wrapper with API key and deployment key"""
        self.api_key = api_key
        self.deployment_key = deployment_key
        self.contact_id = contact_id
        self.client = Orq(
            api_key=api_key,
            contact_id=contact_id
        )
        logger.info(f"Initialized Orq wrapper with deployment key: {deployment_key}")
    
    def generate_response(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        thread_id: Optional[str] = None
    ) -> str:
        """Generate a response using Orq AI"""
        try:
            # Create default metadata if none provided
            if metadata is None:
                metadata = {
                    "request_id": f"req_{uuid.uuid4().hex[:16]}",
                    "source": "hackathon_app"
                }
            
            # Create thread info
            thread_info = {
                "id": thread_id or f"thread_{uuid.uuid4().hex[:16]}",
                "tags": ["hackathon", "eu_assistant"]
            }
            
            # Format the conversation history if provided
            formatted_message = message
            if conversation_history:
                # This is a simple implementation - you might need to format this differently
                # depending on how Orq expects conversation history
                formatted_message = message
            
            logger.info(f"Calling Orq AI with thread ID: {thread_info['id']}")
            
            # Call Orq AI
            completion = self.client.deployments.invoke(
                key=self.deployment_key,
                inputs={
                    "question": formatted_message,
                },
                metadata=metadata,
                thread=thread_info
            )
            
            # Extract response
            response = completion.choices[0].message.content
            logger.info(f"Received response from Orq AI: {response[:50]}...")
            
            return response
            
        except Exception as e:
            logger.error(f"Error calling Orq AI: {str(e)}")
            raise e 