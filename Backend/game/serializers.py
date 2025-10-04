from rest_framework import serializers
from .models import  GameSummary



class GameSummarySerializer(serializers.ModelSerializer):
    # game = GameListSerializer(read_only=True)
    winner_address = serializers.CharField(source='game.winner_address', read_only=True)
    
    class Meta:
        model = GameSummary
        fields = [
            'id', 'game', 'ai_summary', 'total_rounds', 'total_spins',
            'elimination_order', 'key_moments', 'statistics',
            'winner_address', 'generated_at'
        ]