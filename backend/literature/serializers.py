from rest_framework import serializers
from .models import Literature, Annotation

class LiteratureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Literature
        fields = '__all__'

class AnnotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Annotation
        fields = '__all__'
