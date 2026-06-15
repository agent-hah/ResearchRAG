from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.decorators import action
from notes.models import Note, NoteRelationship
from notes.serializers import NoteSerializer, NoteRelationshipSerializer
from notes.services.notes_service import NotesService

class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.all().order_by('-created_at')
    serializer_class = NoteSerializer

    def create(self, request, *args, **kwargs):
        data = request.data
        tags = data.get('tags', [])
        if isinstance(tags, str):
            tags = tags.split(',')
        note = NotesService.create_note(
            title=data.get('title', 'Untitled Note'),
            content=data.get('content'),
            tags=tags,
            dataset_id=data.get('dataset_id'),
            literature_id=data.get('literature_id'),
            query_id=data.get('query_id')
        )
        serializer = self.get_serializer(note)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        tags = data.get('tags', None)
        if isinstance(tags, str):
            tags = tags.split(',')
        note = NotesService.update_note(
            note_id=instance.id,
            title=data.get('title'),
            content=data.get('content'),
            tags=tags
        )
        serializer = self.get_serializer(note)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        NotesService.delete_note(instance.id)

    @action(detail=True, methods=['get'])
    def graph(self, request, pk=None):
        depth = int(request.query_params.get('depth', 2))
        graph_data = NotesService.get_note_graph(int(pk), depth)
        return Response(graph_data)

    @action(detail=False, methods=['get'])
    def tags(self, request):
        tags = NotesService.get_all_tags()
        return Response(tags)

    @action(detail=True, methods=['get'])
    def relationships(self, request, pk=None):
        relationships = NoteRelationship.objects.filter(note_id=pk)
        serializer = NoteRelationshipSerializer(relationships, many=True)
        return Response(serializer.data)

class NoteRelationshipViewSet(viewsets.ModelViewSet):
    queryset = NoteRelationship.objects.all()
    serializer_class = NoteRelationshipSerializer

    def create(self, request, *args, **kwargs):
        data = request.data
        relationship = NotesService.create_relationship(
            note_id=data.get('note_id'),
            target_type=data.get('target_type'),
            target_id=data.get('target_id'),
            relationship_type=data.get('relationship_type'),
            description=data.get('description')
        )
        serializer = self.get_serializer(relationship)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        NotesService.delete_relationship(instance.id)

class RelatedNotesView(views.APIView):
    def get(self, request, target_type, target_id):
        notes = Note.objects.filter(**{f"{target_type}_id": target_id})
        serializer = NoteSerializer(notes, many=True)
        return Response(serializer.data)
