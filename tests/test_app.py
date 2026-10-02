import io, csv, zipfile
from unittest.mock import patch, MagicMock
import pytest
from app import app

@pytest.fixture
def client(): return app.test_client()
CUES=[{'start':1.25,'duration':2.25,'text':'Hello & café <world>'},{'start':1800,'duration':3,'text':'=FORMULA()'}]

def test_health_and_shell(client):
    assert client.get('/health').json['status']=='ok'
    for path in ['/','/manifest.webmanifest','/sw.js','/icon-192.png','/icon-512.png']: assert client.get(path).status_code==200

def test_fetch_is_explicit_and_validated(client):
    assert client.get('/api/transcript/invalid').status_code==400
    assert client.get('/api/transcript/dQw4w9WgXcQ?language=bad123').status_code==400
    result=MagicMock();result.language='English';result.is_generated=True;result.to_raw_data.return_value=CUES
    with patch('app.YouTubeTranscriptApi') as api:
        api.return_value.fetch.return_value=result
        assert client.get('/api/transcript/dQw4w9WgXcQ').json['cues']==CUES
        api.return_value.fetch.assert_called_once_with('dQw4w9WgXcQ',languages=['en'])

def test_failed_fetch(client):
    with patch('app.YouTubeTranscriptApi') as api:
        api.return_value.fetch.side_effect=RuntimeError('secret internal detail')
        r=client.get('/api/transcript/dQw4w9WgXcQ');assert r.status_code==422;assert 'secret' not in r.json['error']

@pytest.mark.parametrize('fmt',['txt','md','csv','srt','vtt','docx','pdf'])
def test_export(client,fmt):
    r=client.post('/api/export',json={'format':fmt,'cues':CUES,'minutes':30,'title':'Example'})
    assert r.status_code==200;assert 'attachment' in r.headers['Content-Disposition']
    if fmt=='docx':
        with zipfile.ZipFile(io.BytesIO(r.data)) as z: assert b'Segment 2' in z.read('word/document.xml')
    elif fmt=='pdf': assert r.data.startswith(b'%PDF')
    elif fmt=='srt': assert b'00:00:01,250 --> 00:00:03,500' in r.data
    elif fmt=='vtt': assert r.data.startswith(b'WEBVTT');assert b'00:30:00.000' in r.data
    elif fmt=='csv':
        rows=list(csv.reader(io.StringIO(r.data.decode('utf-8-sig'))));assert rows[2][0]=='2';assert rows[2][-1].startswith("'")
    else: assert b'Segment 2' in r.data

@pytest.mark.parametrize('minutes',[5,10,15,30,60])
def test_segments(client,minutes):
    r=client.post('/api/export',json={'format':'txt','cues':[{'start':minutes*60,'duration':2,'text':'Boundary'}],'minutes':minutes});assert b'Segment 2' in r.data

def test_validation(client):
    for body in [{},{'format':'exe','cues':CUES},{'format':'txt','cues':[{'start':-1,'duration':0,'text':'bad'}]}]: assert client.post('/api/export',json=body).status_code==400
