# dudebot
discord bot for dudechat

## requirements
 - node
 - python
 - php
 - mysql

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
`python markov.py`

## Daemon
```
pm2 list
pm2 show dudebot2
pm2 logs dudebot2
```

