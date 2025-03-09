# event-sonar

AITX Hackathon: Event Sonar, a vibe checker for events


Project

## Local run
`cd /backend`

Create yourself a virtualenv: `python3 -m venv venv`


then enter the env


 `source venv/bin/activate for mac` or `venv\Scripts\activate for windows`


then install requirements:

`pip install fastapi uvicorn python-multipart httpx python-dotenv`

install Tool house
`pip install toolhouse`

install BeautifulSoup
`pip install beautifulsoup4`


then run the backend server:
`uvicorn main:app --reload`


In another terminal tab:
`cd ../frontend`


then install the modules:
`npm i`


then run the nextjs server:
`npm run dev`
