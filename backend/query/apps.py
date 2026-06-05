from django.apps import AppConfig


class QueryConfig(AppConfig):
    name = "query"

    def ready(self):
        import query.signals  # noqa
