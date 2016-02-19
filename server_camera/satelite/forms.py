from django.forms import ModelForm
from models import Imagen

class ImagenForm(ModelForm):
	class Meta:
		model = Imagen
	#end class
#end class