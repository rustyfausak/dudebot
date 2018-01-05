import markovify

# Get raw text as string.
with open("corpus.txt") as f:
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
