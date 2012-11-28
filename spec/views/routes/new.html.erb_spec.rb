require 'spec_helper'

describe "routes/new" do
  before(:each) do
    assign(:route, stub_model(Route,
      :routeid => "MyString",
      :direction => "MyString",
      :name => "MyString"
    ).as_new_record)
  end

  it "renders new route form" do
    render

    # Run the generator again with the --webrat flag if you want to use webrat matchers
    assert_select "form", :action => routes_path, :method => "post" do
      assert_select "input#route_routeid", :name => "route[routeid]"
      assert_select "input#route_direction", :name => "route[direction]"
      assert_select "input#route_name", :name => "route[name]"
    end
  end
end
