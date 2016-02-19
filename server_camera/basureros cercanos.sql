create or replace function basureros_cercanos(lat numeric, lon numeric) returns setof satelite_basurero as 
$$
begin
	return query(select b.id, nombre, descripcion, gps_id, fecha
			from satelite_basurero as b 
			join satelite_gps as gps 
				on (gps.id = b.gps_id and distancia(gps.latitude::numeric, gps.longitude::numeric, lat, lon) <= 0.00487217386)
		    );
end;
$$
language plpgsql;

select * from basureros_cercanos(10.41413, -75.530156);