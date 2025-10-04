from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from .models import Game, Player, GameSummary
from .serializers import ( 
    GameEventSerializer, GameSummarySerializer,
)
import anthropic
import os

class GameViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for games
    Games are created and updated via blockchain sync, not through API
    """
    permission_classes = [AllowAny]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return GameDetailSerializer
        return GameListSerializer
    
    def get_queryset(self):
        queryset = Game.objects.all().prefetch_related('players', 'events')
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter is not None:
            queryset = queryset.filter(status=int(status_filter))
        
        wallet = self.request.query_params.get('wallet', None)
        if wallet:
            queryset = queryset.filter(players__wallet_address=wallet)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """Get all events for a specific game"""
        game = self.get_object()
        events = game.events.all()
        
        event_type = request.query_params.get('type', None)
        if event_type:
            events = events.filter(event_type=event_type)
        
        serializer = GameEventSerializer(events, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def generate_summary(self, request, pk=None):
        """Generate AI summary for a completed game"""
        game = self.get_object()
        
        if not game.is_completed:
            return Response(
                {'error': 'Game must be completed to generate summary'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if hasattr(game, 'summary'):
            return Response(
                {'message': 'Summary already exists', 'summary_id': game.summary.id},
                status=status.HTTP_200_OK
            )
        
        try:
            players = game.players.all().order_by('joined_at')
            events = game.events.all().order_by('block_height')
            
            elimination_order = []
            for player in players.filter(eliminated=True).order_by('eliminated_round'):
                elimination_order.append({
                    'address': player.wallet_address,
                    'round': player.eliminated_round
                })
            
            total_spins = events.filter(
                event_type__in=['player_survived', 'player_eliminated']
            ).count()
            
            timeline = []
            for event in events:
                timeline.append(f"Round {event.event_data.get('round', '?')}: {event.get_event_type_display()}")
                if event.player_address:
                    timeline.append(f"  Player: {event.player_address[:8]}...")
            
            game_context = f"""
                Game ID: {game.game_id}
                Stake Amount: {game.stake_amount} STX per player
                Total Prize Pool: {game.prize_pool} STX
                Total Players: {players.count()}
                Total Rounds: {game.current_round}
                Total Spins: {total_spins}

                Players (in join order):
                {chr(10).join([f'{i+1}. {p.wallet_address[:10]}... {"(WINNER)" if p.wallet_address == game.winner_address else "(Eliminated Round " + str(p.eliminated_round) + ")" if p.eliminated else ""}' for i, p in enumerate(players)])}

                Game Timeline:
                {chr(10).join(timeline[:50])}  # Limit timeline length

                Winner: {game.winner_address[:10] if game.winner_address else 'N/A'}...
                """
            
            # Generate AI summary
            client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
            
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1500,
                messages=[{
                    "role": "user",
                    "content": f"""You are a commentator for a high-stakes Russian Roulette game on the blockchain. 
                    Write an exciting, dramatic summary of this completed game.

                    Include:
                    1. Opening hook about the stakes and tension
                    2. Key moments from the elimination rounds
                    3. Notable plays (risk mode usage, shield activations, close calls)
                    4. Building tension as players were eliminated
                    5. Dramatic winner announcement
                    6. Final thoughts on the winner's strategy/luck

                    Game Details:
                    {game_context}

                    Write in an engaging, slightly dramatic style like a sports commentator. Keep it under 400 words."""
                }]
            )
            
            ai_summary = message.content[0].text
            
            key_moments = []
            shield_uses = events.filter(event_type='shield_used')
            for shield_event in shield_uses:
                key_moments.append({
                    'type': 'shield_used',
                    'round': shield_event.event_data.get('round'),
                    'player': shield_event.player_address[:10] + '...'
                })
            
            first_elim = events.filter(event_type='player_eliminated').first()
            if first_elim:
                key_moments.append({
                    'type': 'first_blood',
                    'round': first_elim.event_data.get('round'),
                    'player': first_elim.player_address[:10] + '...'
                })
            
            statistics = {
                'average_spins_per_round': round(total_spins / game.current_round, 2) if game.current_round > 0 else 0,
                'shield_uses': shield_uses.count(),
                'risk_mode_uses': players.filter(used_risk_mode=True).count(),
                'survival_rate': round((1 / players.count()) * 100, 2) if players.count() > 0 else 0
            }
            
            summary = GameSummary.objects.create(
                game=game,
                ai_summary=ai_summary,
                total_rounds=game.current_round,
                total_spins=total_spins,
                elimination_order=elimination_order,
                key_moments=key_moments,
                statistics=statistics
            )
            
            serializer = GameSummarySerializer(summary)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate summary: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Get existing AI summary for a game"""
        game = self.get_object()
        
        if not hasattr(game, 'summary'):
            return Response(
                {'error': 'No summary found. Generate one first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = GameSummarySerializer(game.summary)
        return Response(serializer.data)

class GameSummaryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for browsing game summaries"""
    queryset = GameSummary.objects.all().select_related('game')
    serializer_class = GameSummarySerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        wallet = self.request.query_params.get('wallet', None)
        if wallet:
            queryset = queryset.filter(game__players__wallet_address=wallet)
        
        return queryset.order_by('-generated_at')
