# dudebot
discord bot for dudechat

## requirements
 - node >= v8.5.0
 - python
 - php

## install
`npm install`
`pip install markovify`

## configure
Copy `config.example.json` into `config.json` and edit it.

### bot token
See https://discordapp.com/developers/applications/me/

## scripts

### generate markov corpus
`php generate-corpus.php`

### get markov sentence
`py markov.py`

## Daemon
```
pm2 list
pm2 show dudebot
pm2 logs dudebot
```

