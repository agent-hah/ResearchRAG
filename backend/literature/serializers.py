from rest_framework import serializers
from .models import Literature, Annotation

class LiteratureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Literature
        fields = '__all__'

class AnnotationSerializer(serializers.ModelSerializer):
    literature_id = serializers.PrimaryKeyRelatedField(
        queryset=Literature.objects.all(),
        source='literature'
    )

    class Meta:
        model = Annotation
        fields = ['id', 'literature_id', 'annotation_type', 'content', 'highlighted_text', 'page_number', 'x_position', 'y_position', 'width', 'height', 'color', 'rects', 'created_at', 'updated_at']

