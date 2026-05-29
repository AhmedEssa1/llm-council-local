@echo off
REM LLM Council CLI - Windows Batch Wrapper
REM Usage: council.bat "What is 2+2?"

python "%~dp0council.py" %*
