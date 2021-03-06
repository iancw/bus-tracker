class RoutePointsController < ApplicationController

	def index
		@route_points = RoutePoint.all

		respond_to do |format|
			format.html 
			format.json { render json: @route_points }
		end
	end

	def show
		@route_point = RoutePoint.find(params[:id])

		respond_to do |format|
			format.html 
			format.json { render json: @route_point }
		end
	end
end
