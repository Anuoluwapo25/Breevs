from django.db import models


class GameSummary(models.Model):
    """AI-generated summaries of completed games"""
    game = models.OneToOneField(Game, on_delete=models.CASCADE, related_name='summary')
    ai_summary = models.TextField()
    
    total_rounds = models.IntegerField()
    total_spins = models.IntegerField()
    elimination_order = models.JSONField(default=list)  # List of addresses in elimination order
    key_moments = models.JSONField(default=list)  # Notable events
    statistics = models.JSONField(default=dict)  # Game stats
    
    generated_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Summary for Game {self.game.game_id}"