import markovify
import sys
import os
import time

cache_lifetime_minutes = 60

if len(sys.argv) < 2:
	print("Usage: markov.py <channel_id> (<nocache flag>)");
	exit(0)

channel_id = sys.argv[1]

skipcache = False
if len(sys.argv) == 3:
	skipcache = True

# Check the cache file
cachefile = "corpora/" + channel_id + "-cache.json"
if not skipcache and os.path.exists(cachefile) and os.path.getmtime(cachefile) > time.time() - cache_lifetime_minutes * 60:
	# Load cache file
	with open(cachefile) as f:
		cache = f.read()

	# Build the model
	text_model = markovify.Text.from_json(cache)
else:
	# Check that the corpus exists
	corpusfile = "corpora/" + channel_id + ".txt"
	if not os.path.exists(corpusfile):
		exit(0)

	# Get raw text as string
	with open(corpusfile) as f:
		text = f.read()

	# Build the model
	text_model = markovify.NewlineText(text)

	# Save model cache
	model_json = text_model.to_json()
	f = open(cachefile, "w")
	f.write(model_json)
	f.close()

# Try five times for a randomly-generated sentence
for i in range(5):
	s = text_model.make_sentence()
	if (not s):
		continue
	print(s)
	exit(0)
