from django.contrib import admin
from django.urls import path
from .views import GameViewSet

urlpatterns = [
    path('', GameViewSet, name=''),
]