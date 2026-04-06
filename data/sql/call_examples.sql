
CALL public.get_tran_summary(
    select_outer => 'select tb2.*,e.tran_date_bal',
    select_inner => 'select acct_num,acid,tran_date,sum(tran_amt) tran_amt,sum(tran_count) count',
    where_clause => 'where tran_date between ''2021-02-18'' and ''2021-07-01'' ',
    prevdate_where => '',
    thismonth_where => '',
    thisyear_where => '',
    prevmonth_where => '',
    prevyear_where => '',
    prevmonthmtd_where => '',
    prevyearytd_where => '',
    prevmonthsamedate_where => '',
    prevyearsamedate_where => '',
    groupby_clause => 'group by acct_num,acid,tran_date',
    having_clause => '',
    orderby_clause => 'order by tran_date',
    partitionby_clause => 'partition by tran_date',
    eab_join => 'join eab e on e.acid=tb2.acid and cast(tb2.tran_date as date) between e.eod_date and e.end_eod_date',
    user_id => '',
    page => 1,
    page_size => 10
);
SELECT * FROM result;


CALL public.get_tran_summary(
    select_outer => 'select tb2.*,e.tran_date_bal',
    select_inner => 'select acct_num,acid,tran_date,sum(tran_amt) tran_amt,sum(tran_count) count',
    where_clause => 'where tran_date between ''2021-02-18'' and ''2021-07-01'' ',
    prevdate_where => '',
    thismonth_where => '',
    thisyear_where => '',
    prevmonth_where => '',
    prevyear_where => '',
    prevmonthmtd_where => '',
    prevyearytd_where => '',
    prevmonthsamedate_where => '',
    prevyearsamedate_where => '',
    groupby_clause => 'group by acct_num,acid,tran_date',
    having_clause => '',
    orderby_clause => 'order by tran_date',
    partitionby_clause => '',
    eab_join => 'join eab e on e.acid=tb2.acid and cast(tb2.tran_date as date) between e.eod_date and e.end_eod_date',
    user_id => '',
    page => 1,
    page_size => 10
);
SELECT * FROM result;



CALL public.get_tran_summary(
    select_outer => 'select tb2.*',
    select_inner => 'select acct_num,acid,tran_date,sum(tran_amt) tran_amt,sum(tran_count) count',
    where_clause => 'where tran_date between ''2021-02-18'' and ''2021-07-01'' ',
    prevdate_where => '',
    thismonth_where => '',
    thisyear_where => '',
    prevmonth_where => '',
    prevyear_where => '',
    prevmonthmtd_where => '',
    prevyearytd_where => '',
    prevmonthsamedate_where => '',
    prevyearsamedate_where => '',
    groupby_clause => 'group by acct_num,acid,tran_date',
    having_clause => '',
    orderby_clause => 'order by tran_date',
    partitionby_clause => '',
    eab_join => '',
    user_id => '',
    page => 1,
    page_size => 10
);
SELECT * FROM result;
