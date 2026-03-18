#!/usr/bin/env python
import json
import urllib.request

print('=' * 70)
print('PayGraph API Test Suite')
print('=' * 70)

# Test 1: Health Check
print('\n[TEST 1] Health Check Endpoint')
print('-' * 70)
try:
    req = urllib.request.Request('http://localhost:8000/api/v1/health')
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        print(f' Status: {resp.status} {resp.reason}')
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f' Error: {e}')

# Test 2: Route Analysis
print('\n[TEST 2] Route Analysis - USD to BRL')
print('-' * 70)
try:
    payload = json.dumps({
        'source_currency': 'USD',
        'destination_currency': 'BRL',
        'amount': 500,
        'destination_country': 'BR'
    }).encode('utf-8')
    
    req = urllib.request.Request(
        'http://localhost:8000/api/v1/routes/analyze',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        print(f' Status: {resp.status} {resp.reason}')
        print(f'Source Amount: {data["source_amount"]} {data["source_currency"]}')
        print(f'Routes Found: {len(data.get("routes", []))}')
        print(f'Best Overall: {data.get("best_overall_route")}')
        print(f'Cheapest: {data.get("cheapest_route")}')
        print(f'Fastest: {data.get("fastest_route")}')
        print('\nTop Routes:')
        for i, route in enumerate(data.get('routes', [])[:5], 1):
            cost = route['cost']['total_cost']
            time = route['estimated_time_minutes']
            rank = route['overall_rank']
            print(f'  {i}. {route["provider"]:<20} Cost: ${cost:>8.2f}  Time: {time:>4}min  Rank: #{rank}')
except Exception as e:
    print(f' Error: {e}')

# Test 3: Route Analysis with Constraints
print('\n[TEST 3] Route Analysis with Constraints - USD to EUR')
print('-' * 70)
try:
    payload = json.dumps({
        'source_currency': 'USD',
        'destination_currency': 'EUR',
        'amount': 1000,
        'destination_country': 'DE',
        'constraints': {
            'max_cost_percentage': 2.0,
            'max_time_minutes': 120,
            'min_reliability_score': 90
        }
    }).encode('utf-8')
    
    req = urllib.request.Request(
        'http://localhost:8000/api/v1/routes/analyze',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        print(f' Status: {resp.status} {resp.reason}')
        print(f'Source: {data["source_amount"]} {data["source_currency"]}')
        print(f'Routes (with constraints): {len(data.get("routes", []))}')
        if data.get('routes'):
            for i, route in enumerate(data.get('routes', [])[:3], 1):
                print(f'  {i}. {route["provider"]}: ${route["cost"]["total_cost"]:.2f}')
except Exception as e:
    print(f'Error: {e}')

# Test 4: Different Corridor
print('\n[TEST 4] Route Analysis - USD to INR (Different Corridor)')
print('-' * 70)
try:
    payload = json.dumps({
        'source_currency': 'USD',
        'destination_currency': 'INR',
        'amount': 2000,
        'destination_country': 'IN'
    }).encode('utf-8')
    
    req = urllib.request.Request(
        'http://localhost:8000/api/v1/routes/analyze',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        print(f' Status: {resp.status} {resp.reason}')
        print(f'Found {len(data.get("routes", []))} routes')
        if data.get('routes'):
            for i, route in enumerate(data.get('routes', [])[:3], 1):
                reliability = route.get('reliability_score', 0)
                print(f'  {i}. {route["provider"]:<20} Reliability: {reliability:.1f}%')
except Exception as e:
    print(f' Error: {e}')

print('\n' + '=' * 70)
print('All tests completed!')
print('=' * 70)
