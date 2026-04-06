-- PROCEDURE: public.get_tran_summary(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, integer, integer)

-- DROP PROCEDURE IF EXISTS public.get_tran_summary(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, integer, integer);

CREATE OR REPLACE PROCEDURE public.get_tran_summary(
	IN select_outer text,
	IN select_inner text,
	IN where_clause text,
	IN prevdate_where text,
	IN thismonth_where text,
	IN thisyear_where text,
	IN prevmonth_where text,
	IN prevyear_where text,
	IN prevmonthmtd_where text,
	IN prevyearytd_where text,
	IN prevmonthsamedate_where text,
	IN prevyearsamedate_where text,
	IN groupby_clause text,
	IN having_clause text,
	IN orderby_clause text,
	IN partitionby_clause text,
	IN eab_join text,
	IN user_id text,
	IN page integer,
	IN page_size integer)
LANGUAGE 'plpgsql'
AS $BODY$

DECLARE
    query TEXT := '';
	p_offset int := (page - 1) * page_size;
BEGIN
    query := query || select_outer ||' from( ';
	query := query || 'select tb.*,max(total_rows)over() pivoted_totalrows from( ';
    query := query || select_inner || ',ROW_NUMBER()OVER( ' || partitionby_clause || ' ' || orderby_clause || ')RN,count(1)over(' || partitionby_clause || ') total_rows from(';
	query := query || 'select "acct_num",	"cif_id",	"acct_name",	"gam_solid",	"entry_user",	"vfd_user",	"gam_branch",	"gam_province",	"gam_cluster_id",	"gam_cluster",	
						  "tran_branch",		"tran_cluster_id",	"tran_cluster",	"tran_province",	"date",	"year",	"quarter",	"month",	"year_quarter",	"year_month",	
						  "month_startdate",	"month_enddate",	"quarter_startdate",	"quarter_enddate",	"year_startdate",	"year_enddate",	cast("tran_date" as date) "tran_date",	"tran_type",	
						  "part_tran_type",	"acid",	"gl_sub_head_code",	"entry_user_id",	"vfd_user_id",	"tran_solid",	"tran_amt",	"tran_count",	"eod_balance", "merchant", 
						  "service", "product", "tran_source", "signed_tranamt" from tran_summary ts ' || case when where_clause='' then 'where 1=1 ' else where_clause end;
	query := query || 'union all
						select "acct_num",	"cif_id",	"acct_name",	"gam_solid",	"entry_user",	"vfd_user",	"gam_branch",	"gam_province",	"gam_cluster_id",	"gam_cluster",	
						"tran_branch",		"tran_cluster_id",	"tran_cluster",	"tran_province",	"date",	"year",	"quarter",	"month",	"year_quarter",	"year_month",	
						"month_startdate",	"month_enddate",	"quarter_startdate",	"quarter_enddate",	"year_startdate",	"year_enddate", cast("tran_date" as date) "tran_date",	"tran_type",	
						"part_tran_type",	"acid",	"gl_sub_head_code",	"entry_user_id",	"vfd_user_id",	"tran_solid",	"tran_amt",	"tran_count",	"eod_balance", "merchant", 
						"service", "product", "tran_source", "signed_tranamt" from tran_summary ts ' || case when prevdate_where='' then 'where 1=0 ' else prevdate_where end;
	query := query || 'union all
						select "acct_num",	"cif_id",	"acct_name",	"gam_solid",	"entry_user",	"vfd_user",	"gam_branch",	"gam_province",	"gam_cluster_id",	"gam_cluster",	
						"tran_branch",		"tran_cluster_id",	"tran_cluster",	"tran_province",	"date",	"year",	"quarter",	"month",	"year_quarter",	"year_month",	
						"month_startdate",	"month_enddate",	"quarter_startdate",	"quarter_enddate",	"year_startdate",	"year_enddate",	cast("tran_date" as date) "tran_date",	"tran_type",	
						"part_tran_type",	"acid",	"gl_sub_head_code",	"entry_user_id",	"vfd_user_id",	"tran_solid",	"tran_amt",	"tran_count",	"eod_balance", "merchant", 
						"service", "product", "tran_source", "signed_tranamt" from tran_summary ts ' || case when thismonth_where='' then 'where 1=0 ' else thismonth_where end;
	query := query || 'union all
						select "acct_num",	"cif_id",	"acct_name",	"gam_solid",	"entry_user",	"vfd_user",	"gam_branch",	"gam_province",	"gam_cluster_id",	"gam_cluster",	
						"tran_branch",		"tran_cluster_id",	"tran_cluster",	"tran_province",	"date",	"year",	"quarter",	"month",	"year_quarter", cast("year" as varchar(15))	"year_month",	
						"month_startdate",	"month_enddate",	"quarter_startdate",	"quarter_enddate",	"year_startdate",	"year_enddate",	cast("tran_date" as date) "tran_date",	"tran_type",	
						"part_tran_type",	"acid",	"gl_sub_head_code",	"entry_user_id",	"vfd_user_id",	"tran_solid",	"tran_amt",	"tran_count",	"eod_balance", "merchant", 
						"service", "product", "tran_source", "signed_tranamt" from tran_summary ts ' || case when thisyear_where='' then 'where 1=0 ' else thisyear_where end;
	query := query || 'union all
						select "acct_num",	"cif_id",	"acct_name",	"gam_solid",	"entry_user",	"vfd_user",	"gam_branch",	"gam_province",	"gam_cluster_id",	"gam_cluster",	
						"tran_branch",		"tran_cluster_id",	"tran_cluster",	"tran_province",	"date",	"year",	"quarter",	"month",	"year_quarter",	"year_month",	
						"month_startdate",	"month_enddate",	"quarter_startdate",	"quarter_enddate",	"year_startdate",	"year_enddate",	cast("tran_date" as date) "tran_date",	"tran_type",	
						"part_tran_type",	"acid",	"gl_sub_head_code",	"entry_user_id",	"vfd_user_id",	"tran_solid",	"tran_amt",	"tran_count",	"eod_balance", "merchant", 
						"service", "product", "tran_source", "signed_tranamt" from tran_summary ts ' || case when prevmonth_where='' then 'where 1=0 ' else prevmonth_where end;
	query := query || 'union all
						select "acct_num",	"cif_id",	"acct_name",	"gam_solid",	"entry_user",	"vfd_user",	"gam_branch",	"gam_province",	"gam_cluster_id",	"gam_cluster",	
						"tran_branch",		"tran_cluster_id",	"tran_cluster",	"tran_province",	"date",	"year",	"quarter",	"month",	"year_quarter",	cast("year" as varchar(15)) "year_month",	
						"month_startdate",	"month_enddate",	"quarter_startdate",	"quarter_enddate",	"year_startdate",	"year_enddate",	cast("tran_date" as date) "tran_date",	"tran_type",	
						"part_tran_type",	"acid",	"gl_sub_head_code",	"entry_user_id",	"vfd_user_id",	"tran_solid",	"tran_amt",	"tran_count",	"eod_balance", "merchant", 
						"service", "product", "tran_source", "signed_tranamt" from tran_summary ts ' || case when prevyear_where='' then 'where 1=0 ' else prevyear_where end;
	query := query || 'union all
						select "acct_num",	"cif_id",	"acct_name",	"gam_solid",	"entry_user",	"vfd_user",	"gam_branch",	"gam_province",	"gam_cluster_id",	"gam_cluster",	
						"tran_branch",		"tran_cluster_id",	"tran_cluster",	"tran_province",	"date",	"year",	"quarter",	"month",	"year_quarter",	"year_month",	
						"month_startdate",	"month_enddate",	"quarter_startdate",	"quarter_enddate",	"year_startdate",	"year_enddate",	cast("tran_date" as date) "tran_date",	"tran_type",	
						"part_tran_type",	"acid",	"gl_sub_head_code",	"entry_user_id",	"vfd_user_id",	"tran_solid",	"tran_amt",	"tran_count",	"eod_balance", "merchant", 
						"service", "product", "tran_source", "signed_tranamt" from tran_summary ts ' || case when prevmonthMTD_where='' then 'where 1=0 ' else prevmonthMTD_where end;
	query := query || 'union all
						select "acct_num",	"cif_id",	"acct_name",	"gam_solid",	"entry_user",	"vfd_user",	"gam_branch",	"gam_province",	"gam_cluster_id",	"gam_cluster",	
						"tran_branch",		"tran_cluster_id",	"tran_cluster",	"tran_province",	"date",	"year",	"quarter",	"month",	"year_quarter",	concat("year",''_YTD'') "year_month",	
						"month_startdate",	"month_enddate",	"quarter_startdate",	"quarter_enddate",	"year_startdate",	"year_enddate",	cast("tran_date" as date) "tran_date",	"tran_type",	
						"part_tran_type",	"acid",	"gl_sub_head_code",	"entry_user_id",	"vfd_user_id",	"tran_solid",	"tran_amt",	"tran_count",	"eod_balance", "merchant", 
						"service", "product", "tran_source", "signed_tranamt" from tran_summary ts ' || case when prevyearYTD_where='' then 'where 1=0 ' else prevyearYTD_where end;
	query := query || 'union all
						select "acct_num",	"cif_id",	"acct_name",	"gam_solid",	"entry_user",	"vfd_user",	"gam_branch",	"gam_province",	"gam_cluster_id",	"gam_cluster",	
						"tran_branch",		"tran_cluster_id",	"tran_cluster",	"tran_province",	"date",	"year",	"quarter",	"month",	"year_quarter",	"year_month",	
						"month_startdate",	"month_enddate",	"quarter_startdate",	"quarter_enddate",	"year_startdate",	"year_enddate",	cast("tran_date" as date) "tran_date",	"tran_type",	
						"part_tran_type",	"acid",	"gl_sub_head_code",	"entry_user_id",	"vfd_user_id",	"tran_solid",	"tran_amt",	"tran_count",	"eod_balance", "merchant", 
						"service", "product", "tran_source", "signed_tranamt" from tran_summary ts ' || case when prevmonthsamedate_where='' then 'where 1=0 ' else prevmonthsamedate_where end;
	query := query || 'union all
						select "acct_num",	"cif_id",	"acct_name",	"gam_solid",	"entry_user",	"vfd_user",	"gam_branch",	"gam_province",	"gam_cluster_id",	"gam_cluster",	
						"tran_branch",		"tran_cluster_id",	"tran_cluster",	"tran_province",	"date",	"year",	"quarter",	"month",	"year_quarter",	"year_month",	
						"month_startdate",	"month_enddate",	"quarter_startdate",	"quarter_enddate",	"year_startdate",	"year_enddate",	cast("tran_date" as date) "tran_date",	"tran_type",	
						"part_tran_type",	"acid",	"gl_sub_head_code",	"entry_user_id",	"vfd_user_id",	"tran_solid",	"tran_amt",	"tran_count",	"eod_balance", "merchant", 
						"service", "product", "tran_source", "signed_tranamt" from tran_summary ts ' || case when prevyearsamedate_where='' then 'where 1=0 ' else prevyearsamedate_where end;
	query := query || ')ts ';
	query := query || groupby_clause || ' ';
	query := query || having_clause || ')tb ';
	query := query || ' WHERE tb.RN > ' || p_offset || ' AND tb.RN <= ' || p_offset + page_size || ')tb2 ';
	query := query || eab_join || ' ';

	RAISE NOTICE 'Dynamic Query: %', query;

	DROP TABLE IF EXISTS result;
    EXECUTE format('CREATE TEMP TABLE result AS %s', query);
END;
$BODY$;
ALTER PROCEDURE public.get_tran_summary(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, integer, integer)
    OWNER TO postgres;
