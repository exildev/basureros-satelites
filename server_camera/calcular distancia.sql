create or replace function distancia(lat1 numeric,long1 numeric, lat2 numeric, long2 numeric) returns numeric 
as

$BODY$
begin
	return cbrt(power((lat1 - lat2), 2) + power((long1 - long2), 2));
end;
$BODY$

language plpgsql;


