import markovify
import sys

if len(sys.argv) != 2:
	print("Usage: markov.py <channel_id>");
	exit(0)

channel_id = sys.argv[1]

# Get raw text as string.
with open("corpora/" + channel_id + ".txt") as f:
	text = f.read()

# Build the model.
text_model = markovify.NewlineText(text)

# Try five times for a randomly-generated sentence
for i in range(5):
	s = text_model.make_sentence()
	if (not s):
		continue
	print(s)
	exit(0)
