create or replace function json_reportes() returns text as
$BODY$

begin
return (select array_to_json(array_agg(j)) from(select 
	reporte.id,
	fecha,
	gps.latitude,
	gps.longitude,
	(select array_to_json(array_agg(t.imagen)) from (select imagen from satelite_imagen where reporte_id = reporte.id) as t) as imagenes
from satelite_reporte as reporte 
join satelite_gps as gps  on (gps.id = reporte.gps_id)
where basurero_id is NULL) as j);
end;
$BODY$
language plpgsql;


select json_reportes()