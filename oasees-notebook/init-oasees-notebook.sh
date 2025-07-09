#!/bin/sh
exec jupyter lab --ip=0.0.0.0 --port=8081 --no-browser --allow-root --NotebookApp.token='' --NotebookApp.password='' --ServerApp.base_url='/notebook'
