import logging
from locust import HttpUser, task, events, User, between

class QuickstartUser(HttpUser):
    wait_time = between(2,5)
    
    @task
    def simple_request(self):
        self.client.get("/")

    @events.quitting.add_listener
    def _(environment, **kw):
        if environment.stats.total.fail_ratio > 0.01:
            logging.error("Test failed due to failure ratio > 1%")
            environment.process_exit_code = 1
        elif environment.stats.total.get_response_time_percentile(0.95) > 500: #Aim to have <=500ms response time almost all the time
            logging.error("Test failed due to 95th percentile response time > 500 ms")
            environment.process_exit_code = 1
        else:
            environment.process_exit_code = 0
