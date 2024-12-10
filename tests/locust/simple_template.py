from locust import HttpUser, task, events, User, between

class QuickstartUser(HttpUser):
    wait_time = between(1,5)
    
    @task
    def simple_request(self):
        self.client.get("/", timeout=0.5)