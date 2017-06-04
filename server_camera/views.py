from django.shortcuts import redirect

def home(request):
	return redirect('mostrar_basureros')
#end def