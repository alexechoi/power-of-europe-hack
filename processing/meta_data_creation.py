#!/usr/bin/env python3
"""
Script to iterate through all alternatives in the European alternatives JSON file.
This script provides a flexible framework for processing each alternative.
"""

import json
import os
from typing import Dict, List, Any


def load_data(json_file_path: str) -> Dict[str, Any]:
    """Load the JSON data from file."""
    try:
        with open(json_file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        print(f"Error: File {json_file_path} not found.")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        return {}


def process_alternative(service_name: str, alternative: Dict[str, Any], service_context: Dict[str, Any]) -> None:
    """
    Process a single alternative. Customize this function for your specific needs.
    
    Args:
        service_name: Name of the service this alternative belongs to
        alternative: The alternative data
        service_context: Additional context about the parent service
    """
    # Example processing - print basic info about the alternative
    print(f"Service: {service_name}")
    print(f"  Alternative: {alternative.get('name', 'N/A')}")
    print(f"  Country: {alternative.get('country', 'N/A')}")
    print(f"  EU Member: {alternative.get('is_eu_member', False)}")
    print(f"  EFTA Member: {alternative.get('is_efta_member', False)}")
    print(f"  EU Hosted: {alternative.get('is_eu_hosted', False)}")
    print(f"  Free Plan: {alternative.get('has_free_plan', False)}")
    print(f"  Open Source: {alternative.get('is_open_source', False)}")
    print(f"  Website: {alternative.get('website_url', 'N/A')}")
    print(f"  Description: {alternative.get('description', 'N/A')[:100]}...")
    print("-" * 50)


def iterate_alternatives(data: Dict[str, Any]) -> None:
    """
    Iterate through all alternatives in the data.
    
    Args:
        data: The loaded JSON data
    """
    if not data or 'services' not in data:
        print("Error: Invalid data structure")
        return
    
    total_alternatives_processed = 0
    
    # Print summary information
    print(f"Data scraped on: {data.get('scrape_timestamp', 'Unknown')}")
    print(f"Total services: {data.get('total_services', 0)}")
    print(f"Total alternatives: {data.get('total_alternatives', 0)}")
    print("=" * 60)
    
    # Iterate through all services
    for service in data['services']:
        service_name = service.get('service_name', 'Unknown Service')
        service_context = {
            'service_slug': service.get('service_slug', ''),
            'service_url': service.get('service_url', ''),
            'alternatives_count': service.get('alternatives_count', 0)
        }
        
        # Iterate through all alternatives for this service
        alternatives = service.get('alternatives', [])
        for alternative in alternatives:
            process_alternative(service_name, alternative, service_context)
            total_alternatives_processed += 1
    
    print(f"\nProcessed {total_alternatives_processed} alternatives total.")


def get_statistics(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate statistics about the alternatives.
    
    Args:
        data: The loaded JSON data
        
    Returns:
        Dictionary containing various statistics
    """
    if not data or 'services' not in data:
        return {}
    
    stats = {
        'total_services': len(data['services']),
        'total_alternatives': 0,
        'eu_members': 0,
        'efta_members': 0,
        'eu_hosted': 0,
        'free_plans': 0,
        'open_source': 0,
        'countries': set(),
        'alternatives_by_service': {}
    }
    
    for service in data['services']:
        service_name = service.get('service_name', 'Unknown')
        alternatives = service.get('alternatives', [])
        stats['alternatives_by_service'][service_name] = len(alternatives)
        
        for alternative in alternatives:
            stats['total_alternatives'] += 1
            
            if alternative.get('is_eu_member', False):
                stats['eu_members'] += 1
            if alternative.get('is_efta_member', False):
                stats['efta_members'] += 1
            if alternative.get('is_eu_hosted', False):
                stats['eu_hosted'] += 1
            if alternative.get('has_free_plan', False):
                stats['free_plans'] += 1
            if alternative.get('is_open_source', False):
                stats['open_source'] += 1
            
            country = alternative.get('country', '').strip()
            if country:
                stats['countries'].add(country)
    
    stats['countries'] = sorted(list(stats['countries']))
    return stats


def filter_alternatives(data: Dict[str, Any], **filters) -> List[Dict[str, Any]]:
    """
    Filter alternatives based on criteria.
    
    Args:
        data: The loaded JSON data
        **filters: Filter criteria (e.g., is_eu_member=True, is_open_source=True)
        
    Returns:
        List of alternatives matching the filters
    """
    if not data or 'services' not in data:
        return []
    
    filtered_alternatives = []
    
    for service in data['services']:
        service_name = service.get('service_name', 'Unknown')
        alternatives = service.get('alternatives', [])
        
        for alternative in alternatives:
            # Check if alternative matches all filters
            matches = True
            for key, value in filters.items():
                if alternative.get(key) != value:
                    matches = False
                    break
            
            if matches:
                # Add service context to the alternative
                enhanced_alternative = alternative.copy()
                enhanced_alternative['_service_name'] = service_name
                enhanced_alternative['_service_slug'] = service.get('service_slug', '')
                filtered_alternatives.append(enhanced_alternative)
    
    return filtered_alternatives


def main():
    """Main function to run the script."""
    # Path to the JSON file
    json_file_path = 'european_alternatives_final.json'
    
    # Check if file exists in current directory, if not check parent directory
    if not os.path.exists(json_file_path):
        json_file_path = os.path.join('..', json_file_path)
        if not os.path.exists(json_file_path):
            print("Error: JSON file not found in current or parent directory")
            return
    
    # Load the data
    print("Loading data...")
    data = load_data(json_file_path)
    
    if not data:
        return
    
    # Example usage - uncomment the function you want to use:
    
    # 1. Iterate through all alternatives
    # iterate_alternatives(data)
    
    # 2. Generate and print statistics
    print("Generating statistics...")
    stats = get_statistics(data)
    print(f"Total services: {stats['total_services']}")
    print(f"Total alternatives: {stats['total_alternatives']}")
    # print(f"EU members: {stats['eu_members']}")
    # print(f"EFTA members: {stats['efta_members']}")
    print(f"With free plans: {stats['free_plans']}")
    print(f"Open source: {stats['open_source']}")
    print(f"Unique countries: {len(stats['countries'])}")
    print(f"Countries: {', '.join(stats['countries'])}")
    


if __name__ == "__main__":
    main()
