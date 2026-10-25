import re

content = open(r"C:\Redundant Projects\Shell\sources\Playable Games\QuickDraw.html", "r", encoding="utf-8").read()

# Extract CATS array section
cats_start = content.find("const CATS = [")
cats_end = content.find("];", cats_start) + 2
cats_section = content[cats_start:cats_end]

# Parse each category - updated pattern to handle more flexible formatting
cat_pattern = r'''\{id:\s*['"](\w+)['"],\s*name:\s*['"]([^'"]+)['"],\s*free:\s*(true|false),\s*words:\s*\[([\s\S]*?)\]\},'''

categories = []
total_words = 0

for m in re.finditer(cat_pattern, cats_section):
    cat_id, cat_name, free, words_section = m.groups()
    # Extract individual words
    word_entries = re.findall(r"\['([^']+)',\s*(\d)\]", words_section)
    word_list = [w[0] for w in word_entries]
    categories.append({
        'id': cat_id,
        'name': cat_name.strip(),
        'free': free == 'true',
        'words': word_list,
        'count': len(word_list)
    })
    total_words += len(word_list)

print("=== QUICKDRAW WORD DATABASE ===\n")
print(f"Total categories: {len(categories)}")
print(f"Total words: {total_words}\n")

print("Breakdown by category:")
for cat in sorted(categories, key=lambda x: (not x['free'], -x['count'])):
    free_tag = "(FREE)" if cat['free'] else "(paid)"
    print(f"  {cat['name']:20} {free_tag:10} - {cat['count']} words")

print(f"\n{'='*50}")
print(f"TOTAL WORDS IN QUICKDRAW: {total_words}")
print(f"FREE WORDS: {sum(c['count'] for c in categories if c['free'])}")
print(f"PAID WORDS: {sum(c['count'] for c in categories if not c['free'])}")

# List all word counts by difficulty
print("\n=== DIFFICULTY DISTRIBUTION ===")
easy = med = hard = 0
for cat in categories:
    for w in cat['words']:
        # Get difficulty from original content
        pass

# Quick scan for difficulty distribution
easy_pattern = r"\['[^']+',\s*0\]"
med_pattern = r"\['[^']+',\s*1\]"
hard_pattern = r"\['[^']+',\s*2\]"

for m in re.finditer(easy_pattern, cats_section):
    easy += 1
for m in re.finditer(med_pattern, cats_section):
    med += 1
for m in re.finditer(hard_pattern, cats_section):
    hard += 1

print(f"Easy (0): {easy}")
print(f"Medium (1): {med}")
print(f"Hard (2): {hard}")
print(f"Total counting: {easy+med+hard}")