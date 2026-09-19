#!/usr/bin/env python3
import sys
content = open('uiautomator_dump.xml').read()
search_terms = ['title', 'difficult', 'pill', 'planet', 'best', 'score', 'tut']
for term in search_terms:
    found = term in content.lower()
    result = "FOUND" if found else "NOT FOUND"
    print(term + ": " + result)
# Also look for resource IDs related to the game
import re
ids = re.findall(r'resource-id="([^"]+)"', content)
game_ids = [i for i in ids if 'com.redundantstudios.arcade' in i]
print('\nGame-related resource IDs (' + str(len(game_ids)) + ' found):')
for g in game_ids[:30]:
    print('  ' + g)