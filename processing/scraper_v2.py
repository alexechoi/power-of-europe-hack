#!/usr/bin/env python3
"""
European Alternatives Scraper - Production Version

This script scrapes all European alternatives from https://european-alternatives.eu/
and collects comprehensive information about each alternative.

Usage:
    python3 final_scraper.py

Output:
    - european_alternatives_final.json: Complete data in JSON format
    - european_alternatives_final.csv: Tabular data in CSV format
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re
from urllib.parse import urljoin
import csv
from typing import List, Dict, Any

class EuropeanAlternativesScraper:
    def __init__(self):
        self.base_url = "https://european-alternatives.eu"
        self.alternatives_url = "https://european-alternatives.eu/alternatives-to"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.all_alternatives = []
        self.services_data = []
        
    def get_page(self, url: str) -> BeautifulSoup:
        """Fetch and parse a webpage"""
        try:
            print(f"Fetching: {url}")
            response = self.session.get(url)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'html.parser')
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            return None
    
    def extract_service_links(self) -> List[str]:
        """Extract all service URLs from the main alternatives page"""
        print("Extracting service links from main page...")
        soup = self.get_page(self.alternatives_url)
        if not soup:
            return []
        
        service_urls = []
        links = soup.find_all('a', href=True)
        
        for link in links:
            href = link.get('href', '')
            if '/alternative-to/' in href:
                full_url = urljoin(self.base_url, href)
                if full_url not in service_urls:
                    service_urls.append(full_url)
        
        print(f"Found {len(service_urls)} unique service URLs")
        return service_urls
    
    def parse_alternative_from_text(self, text: str) -> Dict[str, Any]:
        """Parse alternative information from text content"""
        alternative = {
            'name': '',
            'country': '',
            'is_eu_member': False,
            'is_efta_member': False,
            'is_eu_hosted': False,
            'has_free_plan': False,
            'is_open_source': False,
            'website_url': '',
            'description': text.strip(),
            'features': []
        }
        
        # Extract name (first word or phrase before 'is')
        sentences = text.split('.')
        if sentences:
            first_sentence = sentences[0].strip()
            words = first_sentence.split()
            if words:
                # Try to extract company name
                if ' is ' in first_sentence:
                    name_part = first_sentence.split(' is ')[0].strip()
                    alternative['name'] = name_part
                else:
                    # Take first word if it looks like a company name
                    potential_name = words[0]
                    if (len(potential_name) > 2 and 
                        potential_name[0].isupper() and
                        potential_name.lower() not in ['the', 'this', 'it', 'they']):
                        alternative['name'] = potential_name
        
        # Extract country information
        country_patterns = [
            r'from\s+([A-Z][a-z]+)',
            r'based\s+in\s+([A-Z][a-z]+)',
            r'([A-Z][a-z]+)\s+(?:company|service|platform|web analytics)',
            r'is\s+a\s+([A-Z][a-z]+)\s+(?:web|analytics|service)',
            r'service\s+from\s+([A-Z][a-z]+)'
        ]
        
        for pattern in country_patterns:
            match = re.search(pattern, text)
            if match:
                country = match.group(1)
                # Filter out common false positives
                if country not in ['Google', 'Analytics', 'Web', 'Service', 'Simple', 'Pro', 'Cloud']:
                    alternative['country'] = country
                    break
        
        # Determine EU membership based on country
        eu_countries = {
            'Germany', 'France', 'Netherlands', 'Poland', 'Spain', 'Italy', 
            'Denmark', 'Austria', 'Estonia', 'Finland', 'Sweden', 'Belgium',
            'Czech', 'Ireland', 'Portugal', 'Slovenia', 'Slovakia', 'Lithuania',
            'Latvia', 'Luxembourg', 'Malta', 'Cyprus', 'Bulgaria', 'Romania',
            'Croatia', 'Hungary', 'Greece'
        }
        
        efta_countries = {'Switzerland', 'Norway', 'Iceland', 'Liechtenstein'}
        
        if alternative['country'] in eu_countries:
            alternative['is_eu_member'] = True
        elif alternative['country'] in efta_countries:
            alternative['is_efta_member'] = True
        
        # Check for features
        text_lower = text.lower()
        if 'eu hosted' in text_lower:
            alternative['is_eu_hosted'] = True
        if 'open source' in text_lower or 'open-source' in text_lower:
            alternative['is_open_source'] = True
        if 'free plan' in text_lower or 'free tier' in text_lower:
            alternative['has_free_plan'] = True
        
        return alternative
    
    def scrape_service_alternatives(self, service_url: str) -> Dict[str, Any]:
        """Scrape alternatives for a specific service"""
        service_slug = service_url.split('/alternative-to/')[-1]
        service_name = service_slug.replace('-', ' ').title()
        
        print(f"Scraping alternatives for: {service_name}")
        
        soup = self.get_page(service_url)
        if not soup:
            return {'service_name': service_name, 'service_slug': service_slug, 'service_url': service_url, 'alternatives': []}
        
        alternatives = []
        
        # Find main content area
        main_content = soup.find('main') or soup.find('div', class_='content') or soup.body
        
        if main_content:
            paragraphs = main_content.find_all('p')
            
            for p in paragraphs:
                text = p.get_text(strip=True)
                
                # Skip short paragraphs and common non-alternative text
                if len(text) < 80:
                    continue
                
                # Skip introduction and footer text
                skip_patterns = [
                    r'^This pages? lists?',
                    r'^.*is a free and widely used',
                    r'^.*is one of the biggest',
                    r'^Any suggestions',
                    r'^Sign up for',
                    r'^We help you find'
                ]
                
                if any(re.match(pattern, text, re.IGNORECASE) for pattern in skip_patterns):
                    continue
                
                # Parse the alternative
                alternative = self.parse_alternative_from_text(text)
                
                # Only add if we found a valid name
                if (alternative['name'] and 
                    len(alternative['name']) > 2 and
                    alternative['name'] not in [alt['name'] for alt in alternatives]):
                    
                    alternatives.append(alternative)
                    self.all_alternatives.append({
                        'service_name': service_name,
                        'service_slug': service_slug,
                        **alternative
                    })
        
        service_data = {
            'service_name': service_name,
            'service_slug': service_slug,
            'service_url': service_url,
            'alternatives_count': len(alternatives),
            'alternatives': alternatives
        }
        
        print(f"Found {len(alternatives)} alternatives for {service_name}")
        return service_data
    
    def scrape_all_services(self, limit: int = None) -> List[Dict[str, Any]]:
        """Scrape all services and their alternatives"""
        service_urls = self.extract_service_links()
        
        if limit:
            service_urls = service_urls[:limit]
            print(f"Limited to first {limit} services for testing")
        
        for i, service_url in enumerate(service_urls):
            print(f"Processing service {i+1}/{len(service_urls)}")
            
            # Add delay to be respectful to the server
            if i > 0:
                time.sleep(1)
            
            service_data = self.scrape_service_alternatives(service_url)
            self.services_data.append(service_data)
        
        return self.services_data
    
    def save_to_json(self, filename: str = "european_alternatives_final.json"):
        """Save all data to JSON file"""
        data = {
            'scrape_timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'total_services': len(self.services_data),
            'total_alternatives': len(self.all_alternatives),
            'services': self.services_data,
            'all_alternatives': self.all_alternatives
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"Data saved to {filename}")
    
    def save_to_csv(self, filename: str = "european_alternatives_final.csv"):
        """Save alternatives data to CSV file"""
        if not self.all_alternatives:
            print("No alternatives data to save")
            return
        
        fieldnames = [
            'service_name', 'service_slug', 'name', 'country',
            'is_eu_member', 'is_efta_member', 'is_eu_hosted', 'has_free_plan',
            'is_open_source', 'website_url', 'description'
        ]
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for alternative in self.all_alternatives:
                row = {field: alternative.get(field, '') for field in fieldnames}
                writer.writerow(row)
        
        print(f"CSV data saved to {filename}")
    
    def print_summary(self):
        """Print a summary of scraped data"""
        print("\n" + "="*60)
        print("EUROPEAN ALTERNATIVES SCRAPING SUMMARY")
        print("="*60)
        print(f"Total services processed: {len(self.services_data)}")
        print(f"Total European alternatives found: {len(self.all_alternatives)}")
        
        if self.services_data:
            print(f"\nTop services by number of alternatives:")
            sorted_services = sorted(self.services_data, key=lambda x: x['alternatives_count'], reverse=True)
            for service in sorted_services[:10]:
                print(f"  {service['service_name']}: {service['alternatives_count']} alternatives")
        
        if self.all_alternatives:
            countries = {}
            for alt in self.all_alternatives:
                country = alt.get('country', 'Unknown')
                if country and country != 'Unknown':
                    countries[country] = countries.get(country, 0) + 1
            
            print(f"\nTop countries by number of alternatives:")
            sorted_countries = sorted(countries.items(), key=lambda x: x[1], reverse=True)
            for country, count in sorted_countries[:15]:
                print(f"  {country}: {count} alternatives")
            
            # Feature statistics
            eu_hosted = sum(1 for alt in self.all_alternatives if alt.get('is_eu_hosted'))
            open_source = sum(1 for alt in self.all_alternatives if alt.get('is_open_source'))
            free_plan = sum(1 for alt in self.all_alternatives if alt.get('has_free_plan'))
            
            print(f"\nFeature statistics:")
            print(f"  EU Hosted: {eu_hosted} alternatives")
            print(f"  Open Source: {open_source} alternatives")
            print(f"  Free Plan: {free_plan} alternatives")

def main():
    """Main function to run the scraper"""
    print("European Alternatives Scraper - Production Version")
    print("="*60)
    print("This will scrape all European alternatives from european-alternatives.eu")
    print("Estimated time: 5-10 minutes for all services")
    print()
    
    # Ask user if they want to run full scrape or test with limited services
    try:
        choice = input("Run full scrape? (y/n, default=n): ").strip().lower()
        if choice == 'y':
            limit = None
            print("Running full scrape of all services...")
        else:
            limit = 10
            print("Running test scrape of first 10 services...")
    except:
        limit = 10
        print("Running test scrape of first 10 services...")
    
    scraper = EuropeanAlternativesScraper()
    
    try:
        # Scrape services and alternatives
        services_data = scraper.scrape_all_services(limit=limit)
        
        # Save data in multiple formats
        scraper.save_to_json()
        scraper.save_to_csv()
        
        # Print summary
        scraper.print_summary()
        
        print("\nScraping completed successfully!")
        print("Files created:")
        print("  - european_alternatives_final.json")
        print("  - european_alternatives_final.csv")
        
    except Exception as e:
        print(f"Error during scraping: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()