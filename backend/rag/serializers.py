from rest_framework import serializers
from .models import Dataset

class DatasetSerializer(serializers.ModelSerializer):
    file_size = serializers.IntegerField(source='file_size_bytes', read_only=True)

    class Meta:
        model = Dataset
        fields = '__all__'
