#!/usr/bin/python           # This is server.py file

import socket
import time

s = socket.socket()
target = '52.169.181.92'
port = 1325


while True:
	s.connect((target,port))
	time.sleep(0.1)
	data = s.recv(1024)
	a = repr(data)
	print a
	s.close()
s.close()
