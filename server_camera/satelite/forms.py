from django.forms import ModelForm
import models 


class ImagenForm(ModelForm):
	class Meta:
		model = models.Imagen
		exclude = []
	#end class
#end class

class BasureroForm(ModelForm):
	class Meta:
		model = models.Basurero
		fields = ['nombre', 'descripcion', 'tamano']
	#end class
#end class